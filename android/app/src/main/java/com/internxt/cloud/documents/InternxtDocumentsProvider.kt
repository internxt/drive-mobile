package com.internxt.cloud.documents

import android.content.Context
import android.database.Cursor
import android.database.MatrixCursor
import android.net.Uri
import android.os.Bundle
import android.os.CancellationSignal
import android.os.Handler
import android.os.HandlerThread
import android.os.OperationCanceledException
import android.os.ParcelFileDescriptor
import android.provider.DocumentsContract
import android.provider.DocumentsContract.Document
import android.provider.DocumentsContract.Root
import android.provider.DocumentsProvider
import android.util.Log
import com.internxt.cloud.R
import com.internxt.cloud.documents.api.AuthConfig
import com.internxt.cloud.documents.api.InternxtApiClient
import com.internxt.cloud.documents.api.InternxtApiException
import com.internxt.cloud.documents.api.model.CreateFileEntry
import com.internxt.cloud.documents.api.model.FinishUploadShard
import com.internxt.cloud.documents.api.model.TrashItem
import com.internxt.cloud.documents.api.model.UploadSlot
import com.internxt.cloud.documents.api.model.UploadedPart
import com.internxt.cloud.documents.auth.InternxtAuthManager
import com.internxt.cloud.documents.cache.DocumentCache
import com.internxt.cloud.documents.crypto.FileKeyDeriver
import com.internxt.cloud.documents.crypto.awaitCryptoService
import com.internxt.cloud.documents.crypto.toHex
import com.internxt.cloud.documents.download.EncryptedFileDownloader
import com.internxt.cloud.documents.http.HttpClients
import com.internxt.cloud.documents.upload.EncryptedFileUploader
import com.internxt.cloud.documents.upload.PendingUpload
import com.rncrypto.util.CryptoService
import java.io.File
import java.io.FileNotFoundException
import java.io.IOException
import java.security.SecureRandom
import java.time.Instant
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors

class InternxtDocumentsProvider : DocumentsProvider() {

    private var authManager: InternxtAuthManager? = null

    private val loaderExecutor = Executors.newSingleThreadExecutor { r ->
        Thread(r, "InternxtDocsProvider-loader").apply { isDaemon = true }
    }

    private val openExecutor = Executors.newCachedThreadPool { r ->
        Thread(r, "InternxtDocsProvider-open").apply { isDaemon = true }
    }

    private val folderLoads = ConcurrentHashMap<String, FolderLoad>()
    private val pendingUploads = ConcurrentHashMap<String, PendingUpload>()

    private enum class LoadState { LOADING, DONE, ERROR }

    private class FolderLoad {
        @Volatile var state: LoadState = LoadState.LOADING
        @Volatile var errorMessage: String? = null
        val rows = mutableListOf<Map<String, Any?>>()
    }
    private val itemKinds = ConcurrentHashMap<String, ItemKind>()
    private lateinit var closeHandler: Handler

    private enum class ItemKind { FILE, FOLDER }

    override fun onCreate(): Boolean {
        val ctx = context ?: return false
        authManager = InternxtAuthManager.create(ctx.applicationContext) ?: return false
        // Process-scoped: ContentProvider has no shutdown hook, so the thread lives until the process dies.
        closeHandler = Handler(HandlerThread("InternxtDocsClose").apply { start() }.looper)
        return true
    }

    override fun queryRoots(projection: Array<String>?): Cursor {
        val cursor = MatrixCursor(resolveRootProjection(projection))
        val ctx = context ?: return cursor
        cursor.setNotificationUri(ctx.contentResolver, DocumentsContract.buildRootsUri(AUTHORITY))

        val rootUuid = authManager?.authenticatedRootUuid()
        Log.d(TAG, "queryRoots: isLoggedIn=${authManager?.isLoggedIn()} rootUuid=$rootUuid")
        if (rootUuid == null) return cursor

        cursor.newRow().apply {
            add(Root.COLUMN_ROOT_ID, ROOT_ID)
            add(Root.COLUMN_DOCUMENT_ID, DocumentId.encodeFolder(rootUuid))
            add(Root.COLUMN_TITLE, ctx.getString(R.string.documents_provider_label))
            authManager?.userEmail()?.let { add(Root.COLUMN_SUMMARY, it) }
            add(Root.COLUMN_FLAGS, Root.FLAG_SUPPORTS_CREATE or Root.FLAG_SUPPORTS_IS_CHILD)
            add(Root.COLUMN_ICON, R.mipmap.ic_launcher)
        }
        return cursor
    }

    override fun queryDocument(documentId: String?, projection: Array<String>?): Cursor {
        val cursor = MatrixCursor(resolveDocumentProjection(projection))
        val ctx = context ?: return cursor
        val id = documentId ?: return cursor
        cursor.setNotificationUri(ctx.contentResolver, DocumentsContract.buildDocumentUri(AUTHORITY, id))
        Log.d(TAG, "queryDocument id=$id")

        if (DocumentId.isUploadToken(id)) {
            pendingUploads[DocumentId.decodeUpload(id)]?.let { pending ->
                cursor.addDocumentRow(pendingUploadRow(id, pending))
            }
            return cursor
        }

        val decoded = DocumentId.decode(id)
        val uuid = decoded?.uuid ?: id

        if (decoded?.kind == DocumentId.Kind.FOLDER && uuid == authManager?.authenticatedRootUuid()) {
            cursor.addDocumentRow(
                DocumentRowBuilder.folderRow(uuid, ctx.getString(R.string.documents_provider_label))
            )
            return cursor
        }

        val api = apiClient(op = "queryDocument")
        val row = if (api == null) null else try {
            fetchDocumentRow(api, decoded?.kind, uuid)
        } catch (e: InternxtApiException) {
            Log.w(TAG, "queryDocument id=$id failed: ${e.javaClass.simpleName}: ${e.message}")
            null
        }

        cursor.addDocumentRow(row ?: DocumentRowBuilder.folderRow(uuid = uuid, displayName = uuid))
        return cursor
    }

    private fun fetchDocumentRow(
        api: InternxtApiClient,
        kind: DocumentId.Kind?,
        uuid: String,
    ): Map<String, Any?>? = when (kind) {
        DocumentId.Kind.FOLDER -> api.getFolder(uuid)?.let(DocumentRowBuilder::folderRow)
        DocumentId.Kind.FILE -> api.getFile(uuid)?.let(DocumentRowBuilder::fileRow)
        null -> api.getFolder(uuid)?.let(DocumentRowBuilder::folderRow)
            ?: api.getFile(uuid)?.let(DocumentRowBuilder::fileRow)
    }

    override fun queryChildDocuments(
        parentDocumentId: String?,
        projection: Array<String>?,
        sortOrder: String?
    ): Cursor {
        val cursor = MatrixCursor(resolveDocumentProjection(projection))
        val ctx = context ?: return cursor
        val parent = parentDocumentId ?: return cursor
        val notifyUri = DocumentsContract.buildChildDocumentsUri(AUTHORITY, parent)
        cursor.setNotificationUri(ctx.contentResolver, notifyUri)
        Log.d(TAG, "queryChildDocuments parent=$parent")

        val decoded = DocumentId.decode(parent)
        if (decoded?.kind == DocumentId.Kind.FILE) {
            Log.w(TAG, "queryChildDocuments called with file id=$parent")
            return cursor
        }
        val parentUuid = decoded?.uuid ?: parent

        val load = folderLoads.computeIfAbsent(parent) {
            FolderLoad().also { startBackgroundLoad(parentUuid, it, notifyUri) }
        }

        val snapshot: List<Map<String, Any?>>
        val state: LoadState
        val errorMessage: String?
        synchronized(load) {
            snapshot = load.rows.toList()
            state = load.state
            errorMessage = load.errorMessage
        }
        snapshot.forEach { cursor.addDocumentRow(it) }

        cursor.extras = Bundle().apply {
            putBoolean(DocumentsContract.EXTRA_LOADING, state == LoadState.LOADING)
            if (state == LoadState.ERROR && errorMessage != null) {
                putString(DocumentsContract.EXTRA_ERROR, errorMessage)
            }
        }
        return cursor
    }

    private fun startBackgroundLoad(parent: String, load: FolderLoad, notifyUri: Uri) {
        loaderExecutor.execute {
            val api = apiClient(op = "queryChildDocuments[bg]")
            if (api == null) {
                finishLoad(load, notifyUri, LoadState.ERROR, NOT_AUTHENTICATED)
                return@execute
            }
            try {
                streamPages({ offset, size -> api.listFolderFolders(parent, offset, size) }) { page ->
                    appendRows(load, notifyUri, page.map { DocumentRowBuilder.folderRow(it) })
                }
                streamPages({ offset, size -> api.listFolderFiles(parent, offset, size) }) { page ->
                    appendRows(load, notifyUri, page.map { DocumentRowBuilder.fileRow(it) })
                }
                finishLoad(load, notifyUri, LoadState.DONE, null)
                Log.d(TAG, "queryChildDocuments parent=$parent loaded rows=${load.rows.size}")
            } catch (e: InternxtApiException) {
                Log.w(TAG, "queryChildDocuments parent=$parent failed: ${e.javaClass.simpleName}: ${e.message}")
                finishLoad(load, notifyUri, LoadState.ERROR, e.message)
            }
        }
    }

    private fun appendRows(load: FolderLoad, notifyUri: Uri, rows: List<Map<String, Any?>>) {
        if (rows.isEmpty()) return
        synchronized(load) { load.rows.addAll(rows) }
        context?.contentResolver?.notifyChange(notifyUri, null)
    }

    private fun finishLoad(load: FolderLoad, notifyUri: Uri, state: LoadState, errorMessage: String?) {
        synchronized(load) {
            load.state = state
            load.errorMessage = errorMessage
        }
        context?.contentResolver?.notifyChange(notifyUri, null)
    }

    private fun apiClient(op: String): InternxtApiClient? {
        val cfg = authManager?.loadAuthConfig()
        if (cfg == null) {
            Log.w(TAG, "$op: loadAuthConfig() returned null")
            return null
        }
        return InternxtApiClient(cfg)
    }

    private inline fun <T> streamPages(fetch: (offset: Int, size: Int) -> List<T>, onPage: (List<T>) -> Unit) {
        val pageSize = InternxtApiClient.DEFAULT_PAGE_SIZE
        var offset = 0
        while (true) {
            val page = fetch(offset, pageSize)
            onPage(page)
            if (page.size < pageSize) break
            offset += pageSize
        }
    }

    private fun MatrixCursor.addDocumentRow(row: Map<String, Any?>) {
        val builder = newRow()
        row.forEach { (column, value) -> builder.add(column, value) }
    }

    override fun renameDocument(documentId: String, displayName: String): String? =
        mutate("renameDocument", documentId) { api, kind, uuid ->
            val parent = parentUuidOf(api, kind, uuid)
            when (kind) {
                DocumentId.Kind.FILE -> api.renameFile(uuid, displayName)
                DocumentId.Kind.FOLDER -> api.renameFolder(uuid, displayName)
            }
            notifyEncodedParent(parent) { encoded ->
                patchRowDisplayName(encoded, documentId, displayName)
            }
            null
        }

    override fun moveDocument(
        sourceDocumentId: String,
        sourceParentDocumentId: String?,
        targetParentDocumentId: String,
    ): String? = mutate("moveDocument", sourceDocumentId) { api, kind, uuid ->
        val targetUuid = rawUuid(targetParentDocumentId)
        when (kind) {
            DocumentId.Kind.FILE -> api.moveFile(uuid, targetUuid)
            DocumentId.Kind.FOLDER -> api.moveFolder(uuid, targetUuid)
        }
        sourceParentDocumentId?.let {
            removeRow(it, sourceDocumentId)
            notifyChildren(it)
        }
        invalidateChildren(targetParentDocumentId)
        null
    }

    override fun deleteDocument(documentId: String) {
        mutate("deleteDocument", documentId) { api, kind, uuid ->
            val parent = parentUuidOf(api, kind, uuid)
            api.sendToTrash(listOf(TrashItem(uuid, trashTypeOf(kind))))
            notifyEncodedParent(parent) { encoded ->
                removeRow(encoded, documentId)
            }
        }
    }

    private inline fun <R> mutate(
        op: String,
        documentId: String,
        block: (api: InternxtApiClient, kind: DocumentId.Kind, uuid: String) -> R,
    ): R {
        val api = apiClient(op) ?: throw FileNotFoundException("No auth")
        val kind = resolveKind(api, documentId) ?: throw FileNotFoundException("Not found: $documentId")
        return try {
            block(api, kind, rawUuid(documentId))
        } catch (e: InternxtApiException) {
            Log.w(TAG, "$op $documentId failed: ${e.javaClass.simpleName}: ${e.message}")
            throw FileNotFoundException(e.message)
        }
    }

    private fun parentUuidOf(api: InternxtApiClient, kind: DocumentId.Kind, uuid: String): String? =
        when (kind) {
            DocumentId.Kind.FILE -> api.getFile(uuid)?.folderUuid
            DocumentId.Kind.FOLDER -> api.getFolder(uuid)?.parentUuid
        }

    private fun trashTypeOf(kind: DocumentId.Kind): TrashItem.Type = when (kind) {
        DocumentId.Kind.FILE -> TrashItem.Type.FILE
        DocumentId.Kind.FOLDER -> TrashItem.Type.FOLDER
    }

    private inline fun notifyEncodedParent(rawParentUuid: String?, mutateCache: (encodedParent: String) -> Unit) {
        rawParentUuid?.let {
            val encoded = DocumentId.encodeFolder(it)
            mutateCache(encoded)
            notifyChildren(encoded)
        }
    }

    private fun rawUuid(documentId: String): String =
        DocumentId.decode(documentId)?.uuid ?: documentId

    private fun resolveKind(api: InternxtApiClient, documentId: String): DocumentId.Kind? {
        DocumentId.decode(documentId)?.kind?.let { return it }
        return api.getFolder(documentId)?.let { DocumentId.Kind.FOLDER }
            ?: api.getFile(documentId)?.let { DocumentId.Kind.FILE }
    }

    private fun notifyChildren(parentDocumentId: String) {
        context?.contentResolver?.notifyChange(
            DocumentsContract.buildChildDocumentsUri(AUTHORITY, parentDocumentId),
            null,
        )
    }

    private fun invalidateChildren(parentDocumentId: String) {
        folderLoads.remove(parentDocumentId)
        notifyChildren(parentDocumentId)
    }

    private fun patchRowDisplayName(parentDocumentId: String, documentId: String, displayName: String) {
        updateRows(parentDocumentId) { rows ->
            val idx = rows.indexOfFirst { it[Document.COLUMN_DOCUMENT_ID] == documentId }
            if (idx >= 0) rows[idx] = rows[idx] + (Document.COLUMN_DISPLAY_NAME to displayName)
        }
    }

    private fun removeRow(parentDocumentId: String, documentId: String) {
        updateRows(parentDocumentId) { rows ->
            rows.removeAll { it[Document.COLUMN_DOCUMENT_ID] == documentId }
        }
    }

    private inline fun updateRows(
        parentDocumentId: String,
        action: (MutableList<Map<String, Any?>>) -> Unit,
    ) {
        val load = folderLoads[parentDocumentId] ?: return
        synchronized(load) { action(load.rows) }
    }

    override fun refresh(uri: Uri, args: Bundle?, cancellationSignal: CancellationSignal?): Boolean {
        val documentId = try { DocumentsContract.getDocumentId(uri) } catch (_: Exception) { null }
        Log.d(TAG, "refresh uri=$uri documentId=$documentId")
        if (documentId == null) return false
        invalidateChildren(documentId)
        return true
    }

    override fun openDocument(
        documentId: String?,
        mode: String?,
        signal: CancellationSignal?
    ): ParcelFileDescriptor {
        val ctx = context ?: throw FileNotFoundException("No context")
        val id = documentId ?: throw FileNotFoundException("No document id")
        val effectiveMode = mode ?: "r"
        if (effectiveMode.contains('w')) {
            return openForWrite(ctx, id, signal)
        }
        if (effectiveMode != "r") {
            throw UnsupportedOperationException("Unsupported mode=$effectiveMode")
        }

        val decoded = DocumentId.decode(id)
        if (decoded?.kind != DocumentId.Kind.FILE) {
            throw FileNotFoundException("openDocument requires a file id (got=$id)")
        }
        val fileUuid = decoded.uuid

        val future = openExecutor.submit<ParcelFileDescriptor> {
            openDocumentBlocking(ctx, id, signal, fileUuid)
        }
        return try {
            future.get()
        } catch (e: java.util.concurrent.ExecutionException) {
            val cause = e.cause
            if (cause is FileNotFoundException) throw cause
            throw FileNotFoundException("openDocument failed: ${cause?.message ?: e.message}").apply {
                if (cause != null) initCause(cause)
            }
        }
    }

    private fun openDocumentBlocking(
        ctx: Context,
        id: String,
        signal: CancellationSignal?,
        fileUuid: String,
    ): ParcelFileDescriptor {
        val cfg = authManager?.loadAuthConfig() ?: throw FileNotFoundException(NOT_AUTHENTICATED)
        if (cfg.mnemonic.isBlank()) {
            throw FileNotFoundException("Stored credentials have no mnemonic; sign out and back in")
        }
        val api = InternxtApiClient(cfg)
        val file = try {
            requireFileMetadata(api, fileUuid)
        } catch (e: FileNotFoundException) {
            DocumentCache.existingCacheFor(ctx, id)?.let { return openCached(ctx, id, it) }
            throw e
        }

        val cacheFile = DocumentCache.cacheFileFor(ctx, id, file.updatedAt)
        if (cacheFile.exists() && cacheFile.length() > 0) {
            return openCached(ctx, id, cacheFile)
        }
        materializeIntoCache(ctx, id, api, cfg.mnemonic, file, cacheFile, signal)
        return openCached(ctx, id, cacheFile)
    }

    private data class FileMetadata(
        val bucket: String,
        val fileId: String,
        val updatedAt: String,
    )

    private fun requireFileMetadata(api: InternxtApiClient, fileUuid: String): FileMetadata {
        val file = try {
            api.getFile(fileUuid) ?: throw FileNotFoundException("File not found: $fileUuid")
        } catch (e: InternxtApiException) {
            throw FileNotFoundException("getFile $fileUuid failed: ${e.message}")
        }
        return FileMetadata(
            bucket = file.bucket ?: throw FileNotFoundException("File $fileUuid has no bucket"),
            fileId = file.fileId ?: throw FileNotFoundException("File $fileUuid has no fileId"),
            updatedAt = file.updatedAt ?: throw FileNotFoundException("File $fileUuid has no updatedAt"),
        )
    }

    private fun materializeIntoCache(
        ctx: Context,
        id: String,
        api: InternxtApiClient,
        mnemonic: String,
        file: FileMetadata,
        cacheFile: File,
        signal: CancellationSignal?,
    ) {
        val (tempEnc, tempDec) = DocumentCache.tempPaths(ctx, id)
        try {
            signal?.throwIfCanceled()
            val links = api.getDownloadLinks(file.bucket, file.fileId)
            EncryptedFileDownloader.download(HttpClients.download, links.shards, tempEnc, signal)

            signal?.throwIfCanceled()
            val key = FileKeyDeriver.deriveFileKey(mnemonic, file.bucket, links.index)
            val iv = FileKeyDeriver.deriveIv(links.index)
            decryptBlocking(tempEnc, tempDec, key.toHex(), iv.toHex())

            if (!tempDec.renameTo(cacheFile)) {
                throw FileNotFoundException("Failed to promote temp file to cache for $id")
            }
            tempEnc.delete()
            DocumentCache.pruneSiblings(ctx, id, cacheFile)
        } catch (e: Exception) {
            tempEnc.delete()
            tempDec.delete()
            throw when (e) {
                is FileNotFoundException -> e
                is OperationCanceledException ->
                    FileNotFoundException("openDocument $id cancelled").apply { initCause(e) }
                else ->
                    FileNotFoundException("openDocument $id failed: ${e.message}").apply { initCause(e) }
            }
        }
    }

    private fun openCached(ctx: Context, id: String, cacheFile: File): ParcelFileDescriptor =
        ParcelFileDescriptor.open(
            cacheFile,
            ParcelFileDescriptor.MODE_READ_ONLY,
            closeHandler,
        ) { DocumentCache.deleteTempsFor(ctx, id) }

    override fun createDocument(parentDocumentId: String, mimeType: String, displayName: String): String {
        val api = apiClient("createDocument") ?: throw FileNotFoundException(NOT_AUTHENTICATED)
        val parentUuid = rawUuid(parentDocumentId)
        try {
            api.getFolder(parentUuid) ?: throw FileNotFoundException("Parent not found: $parentDocumentId")
        } catch (e: InternxtApiException) {
            throw FileNotFoundException("Parent lookup failed: ${e.message}")
        }

        val normalized = collapseRedundantExtensions(displayName, mimeType)
        val resolvedName = pickUniqueName(api, parentUuid, normalized)
        evictStalePendingUploads()
        val token = UUID.randomUUID().toString()
        pendingUploads[token] = PendingUpload(parentUuid, resolvedName, mimeType)
        return DocumentId.encodeUpload(token)
    }

    private fun evictStalePendingUploads() {
        val cutoff = System.currentTimeMillis() - PENDING_UPLOAD_TTL_MS
        pendingUploads.entries.removeAll { it.value.createdAtMillis < cutoff }
    }

    private fun collapseRedundantExtensions(displayName: String, mimeType: String): String {
        val canonicalExt = android.webkit.MimeTypeMap.getSingleton()
            .getExtensionFromMimeType(mimeType)?.lowercase()
        if (canonicalExt.isNullOrBlank()) return displayName
        val suffix = ".$canonicalExt"
        var name = displayName
        while (name.length > suffix.length && name.endsWith(suffix, ignoreCase = true)) {
            val candidate = name.dropLast(suffix.length)
            if (candidate.endsWith(suffix, ignoreCase = true)) {
                name = candidate
            } else {
                break
            }
        }
        return name
    }

    private fun pickUniqueName(api: InternxtApiClient, parentUuid: String, requested: String): String {
        val existing = HashSet<String>()
        try {
            streamPages({ offset, size -> api.listFolderFiles(parentUuid, offset, size) }) { page ->
                page.forEach { existing.add(joinNameType(it.plainName, it.type)) }
            }
        } catch (e: InternxtApiException) {
            Log.w(TAG, "pickUniqueName: listing failed, using requested name. ${e.message}")
            return requested
        }
        if (requested !in existing) return requested
        val (base, ext) = splitNameExt(requested)
        for (i in 1..MAX_SUFFIX_ATTEMPTS) {
            val candidate = "$base ($i)$ext"
            if (candidate !in existing) return candidate
        }
        // Backstop for the (practically impossible) case where 1..1000 are all taken —
        // the backend permits duplicate names, so a UUID-suffixed name is always safe.
        return "$base (${UUID.randomUUID()})$ext"
    }

    private fun splitNameExt(name: String): Pair<String, String> {
        val dot = name.lastIndexOf('.')
        val hasExt = dot > 0 && dot < name.length - 1
        return if (hasExt) name.substring(0, dot) to name.substring(dot) else name to ""
    }

    private fun joinNameType(plainName: String, type: String?): String =
        if (type.isNullOrBlank()) plainName else "$plainName.$type"

    private fun openForWrite(
        ctx: Context,
        documentId: String,
        signal: CancellationSignal?,
    ): ParcelFileDescriptor {
        val token = DocumentId.decodeUpload(documentId)
            ?: throw FileNotFoundException("Write only supported on pending uploads: $documentId")
        val pending = pendingUploads[token]
            ?: throw FileNotFoundException("Unknown upload token: $token")

        try {
            val cfg = authManager?.loadAuthConfig() ?: throw FileNotFoundException(NOT_AUTHENTICATED)
            if (cfg.mnemonic.isBlank()) {
                throw FileNotFoundException("Stored credentials have no mnemonic; sign out and back in")
            }
            val pipe = ParcelFileDescriptor.createReliablePipe()
            val readEnd = pipe[0]
            val writeEnd = pipe[1]
            openExecutor.execute {
                runUpload(ctx, token, pending, cfg, readEnd, signal)
            }
            return writeEnd
        } catch (t: Throwable) {
            pendingUploads.remove(token)
            throw t
        }
    }

    private fun runUpload(
        ctx: Context,
        token: String,
        pending: PendingUpload,
        cfg: AuthConfig,
        readEnd: ParcelFileDescriptor,
        signal: CancellationSignal?,
    ) {
        val temps = uploadTempsFor(ctx, token)
        var failure: Throwable? = null
        try {
            val api = InternxtApiClient(cfg)
            val bucketId = resolveBucket(api, pending.parentUuid)
            val crypto = prepareEncryption(cfg.mnemonic, bucketId)
            val encrypted = encryptInputToTemp(temps, readEnd, crypto, signal)
            val outcome = uploadEncryptedFile(api, temps.enc, bucketId, encrypted, signal)
            finalizeAndRecordFile(api, pending, bucketId, crypto.indexHex, encrypted.size, outcome)
            invalidateChildren(DocumentId.encodeFolder(pending.parentUuid))
        } catch (t: Throwable) {
            if (t !is OperationCanceledException) {
                Log.w(TAG, "upload failed token=$token: ${t.javaClass.simpleName}: ${t.message}")
            }
            failure = t
        } finally {
            closePipeEnd(readEnd, failure)
            deleteTempQuietly(temps.plain)
            deleteTempQuietly(temps.enc)
            pendingUploads.remove(token)
        }
    }

    /** `tempEnc` holds the ciphertext PUT to bridge; `plain` holds the pipe's plaintext
     *  while we hand it to CryptoService (which only accepts file paths). */
    private data class UploadTemps(val plain: File, val enc: File)

    private fun uploadTempsFor(ctx: Context, token: String): UploadTemps {
        val (enc, plain) = DocumentCache.tempPaths(ctx, token)
        return UploadTemps(plain = plain, enc = enc)
    }

    private fun resolveBucket(api: InternxtApiClient, parentUuid: String): String {
        val parent = api.getFolder(parentUuid)
            ?: throw IOException("Parent folder not found: $parentUuid")
        return parent.bucket
            ?: throw IOException("Parent folder $parentUuid has no bucket")
    }

    private fun prepareEncryption(mnemonic: String, bucketId: String): EncryptionContext {
        val indexHex = ByteArray(32).also { SecureRandom().nextBytes(it) }.toHex()
        return EncryptionContext(
            key = FileKeyDeriver.deriveFileKey(mnemonic, bucketId, indexHex),
            iv = FileKeyDeriver.deriveIv(indexHex),
            indexHex = indexHex,
        )
    }

    private fun encryptInputToTemp(
        temps: UploadTemps,
        readEnd: ParcelFileDescriptor,
        crypto: EncryptionContext,
        signal: CancellationSignal?,
    ): EncryptedFileUploader.Encrypted {
        // Phase 1: drain the pipe into a plaintext file on disk — CryptoService is
        // path-based, so we must materialize before encrypting. Cancellation lives here
        // because this is the long-running streaming phase.
        drainPipeToFile(readEnd, temps.plain, signal)
        signal?.throwIfCanceled()
        // Phase 2: hand the plaintext file to the official rn-crypto CryptoService — same
        // call the RN side makes from NetworkFacade.ts, identical AES-CTR pipeline.
        return EncryptedFileUploader.encryptFile(temps.plain, temps.enc, crypto.key, crypto.iv)
    }

    private fun drainPipeToFile(
        readEnd: ParcelFileDescriptor,
        target: File,
        signal: CancellationSignal?,
    ) {
        val buffer = ByteArray(EncryptedFileUploader.COPY_BUFFER_SIZE)
        // dup() so the InputStream owns its own FD; the original `readEnd` survives for
        // the eventual close()/closeWithError() in `runUpload`'s finally.
        readEnd.dup().use { dup ->
            ParcelFileDescriptor.AutoCloseInputStream(dup).use { source ->
                target.outputStream().use { sink ->
                    while (true) {
                        signal?.throwIfCanceled()
                        val n = source.read(buffer)
                        if (n == -1) break
                        sink.write(buffer, 0, n)
                    }
                    sink.flush()
                }
            }
        }
    }

    private fun uploadEncryptedFile(
        api: InternxtApiClient,
        tempEnc: File,
        bucketId: String,
        encrypted: EncryptedFileUploader.Encrypted,
        signal: CancellationSignal?,
    ): UploadOutcome {
        val partsCount = if (encrypted.size >= MULTIPART_THRESHOLD) {
            ((encrypted.size + MULTIPART_PART_SIZE - 1) / MULTIPART_PART_SIZE).toInt().coerceAtLeast(1)
        } else 1

        val slot = api.startUpload(bucketId, encrypted.size, partsCount).uploads.firstOrNull()
            ?: throw IOException("Bridge /start returned no upload slot")

        return when (slot) {
            is UploadSlot.Single -> {
                EncryptedFileUploader.uploadSingle(HttpClients.upload, tempEnc, slot.url, signal)
                UploadOutcome.Single(slot.uuid, listOf(encrypted.wholeSha256Hex))
            }
            is UploadSlot.Multipart -> {
                val partHashes = EncryptedFileUploader.computePartSha256(tempEnc, MULTIPART_PART_SIZE)
                val parts = EncryptedFileUploader.uploadMultipart(
                    HttpClients.upload, tempEnc, slot.urls, MULTIPART_PART_SIZE, signal,
                )
                UploadOutcome.Multipart(slot.uuid, partHashes, parts, slot.uploadId)
            }
        }
    }

    private fun finalizeAndRecordFile(
        api: InternxtApiClient,
        pending: PendingUpload,
        bucketId: String,
        indexHex: String,
        encryptedSize: Long,
        outcome: UploadOutcome,
    ) {
        val hash = EncryptedFileUploader.computeShardHash(outcome.partHashes)
        val shard = when (outcome) {
            is UploadOutcome.Single -> FinishUploadShard(uuid = outcome.slotUuid, hash = hash)
            is UploadOutcome.Multipart -> FinishUploadShard(
                uuid = outcome.slotUuid,
                hash = hash,
                uploadId = outcome.uploadId,
                parts = outcome.parts,
            )
        }
        val finish = api.finishUpload(bucketId, indexHex, listOf(shard))

        val nowIso = Instant.now().toString()
        val (basePlain, ext) = splitNameExt(pending.plainName)
        api.createFileEntry(
            CreateFileEntry(
                fileId = finish.id,
                type = ext.removePrefix("."),
                size = encryptedSize,
                plainName = basePlain,
                bucket = bucketId,
                folderUuid = pending.parentUuid,
                modificationTime = nowIso,
                creationTime = nowIso,
            )
        )
    }

    private fun closePipeEnd(readEnd: ParcelFileDescriptor, failure: Throwable?) {
        try {
            if (failure != null) {
                readEnd.closeWithError(failure.message ?: "Upload failed")
            } else {
                readEnd.close()
            }
        } catch (e: IOException) {
            Log.w(TAG, "closing readEnd failed: ${e.message}")
        }
    }

    private fun deleteTempQuietly(tempEnc: File) {
        if (!tempEnc.delete() && tempEnc.exists()) {
            Log.w(TAG, "Failed to delete temp upload file: ${tempEnc.absolutePath}")
        }
    }

    private data class EncryptionContext(
        val key: ByteArray,
        val iv: ByteArray,
        val indexHex: String,
    )

    private sealed class UploadOutcome {
        abstract val slotUuid: String
        abstract val partHashes: List<String>

        data class Single(
            override val slotUuid: String,
            override val partHashes: List<String>,
        ) : UploadOutcome()

        data class Multipart(
            override val slotUuid: String,
            override val partHashes: List<String>,
            val parts: List<UploadedPart>,
            val uploadId: String,
        ) : UploadOutcome()
    }

    private fun pendingUploadRow(documentId: String, pending: PendingUpload): Map<String, Any?> = mapOf(
        Document.COLUMN_DOCUMENT_ID to documentId,
        Document.COLUMN_MIME_TYPE to pending.mimeType,
        Document.COLUMN_DISPLAY_NAME to pending.plainName,
        Document.COLUMN_LAST_MODIFIED to null,
        Document.COLUMN_FLAGS to 0,
        Document.COLUMN_SIZE to null,
    )

    private fun decryptBlocking(src: File, dst: File, hexKey: String, hexIv: String) {
        awaitCryptoService("Decryption failed") { cb ->
            CryptoService.getInstance().decryptFile(
                src.absolutePath,
                dst.absolutePath,
                hexKey,
                hexIv,
                /* runInBackground = */ false,
                cb,
            )
        }
    }

    private fun resolveRootProjection(projection: Array<String>?): Array<String> =
        projection ?: DEFAULT_ROOT_PROJECTION

    private fun resolveDocumentProjection(projection: Array<String>?): Array<String> =
        projection ?: DEFAULT_DOCUMENT_PROJECTION

    companion object {
        const val AUTHORITY = "com.internxt.cloud.documents"
        private const val ROOT_ID = "internxt-root"
        private const val TAG = "InternxtDocsProvider"

        private const val MULTIPART_THRESHOLD = 100L * 1024L * 1024L
        private const val MULTIPART_PART_SIZE = 30L * 1024L * 1024L
        private const val MAX_SUFFIX_ATTEMPTS = 1000
        private const val PENDING_UPLOAD_TTL_MS = 60L * 60L * 1000L
        private const val NOT_AUTHENTICATED = "Not authenticated"

        private val DEFAULT_ROOT_PROJECTION = arrayOf(
            Root.COLUMN_ROOT_ID,
            Root.COLUMN_FLAGS,
            Root.COLUMN_ICON,
            Root.COLUMN_TITLE,
            Root.COLUMN_SUMMARY,
            Root.COLUMN_DOCUMENT_ID,
            Root.COLUMN_AVAILABLE_BYTES
        )

        private val DEFAULT_DOCUMENT_PROJECTION = arrayOf(
            Document.COLUMN_DOCUMENT_ID,
            Document.COLUMN_MIME_TYPE,
            Document.COLUMN_DISPLAY_NAME,
            Document.COLUMN_LAST_MODIFIED,
            Document.COLUMN_FLAGS,
            Document.COLUMN_SIZE
        )
    }
}
