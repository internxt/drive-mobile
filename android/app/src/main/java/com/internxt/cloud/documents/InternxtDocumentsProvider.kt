package com.internxt.cloud.documents

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
import com.internxt.cloud.documents.api.InternxtApiClient
import com.internxt.cloud.documents.api.InternxtApiException
import com.internxt.cloud.documents.api.model.TrashItem
import com.internxt.cloud.documents.auth.InternxtAuthManager
import com.internxt.cloud.documents.cache.DocumentCache
import com.internxt.cloud.documents.crypto.FileKeyDeriver
import com.internxt.cloud.documents.crypto.toHex
import com.internxt.cloud.documents.download.EncryptedFileDownloader
import com.internxt.cloud.documents.http.HttpClients
import com.rncrypto.util.CryptoService
import java.io.File
import java.io.FileNotFoundException
import java.util.concurrent.CompletableFuture
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
                finishLoad(load, notifyUri, LoadState.ERROR, "Not authenticated")
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
        if (mode != null && mode != "r") {
            throw UnsupportedOperationException("Only read-only access is supported (mode=$mode)")
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
        ctx: android.content.Context,
        id: String,
        signal: CancellationSignal?,
        fileUuid: String,
    ): ParcelFileDescriptor {
        val cfg = authManager?.loadAuthConfig() ?: throw FileNotFoundException("Not authenticated")
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
        ctx: android.content.Context,
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

    private fun openCached(ctx: android.content.Context, id: String, cacheFile: File): ParcelFileDescriptor =
        ParcelFileDescriptor.open(
            cacheFile,
            ParcelFileDescriptor.MODE_READ_ONLY,
            closeHandler,
        ) { DocumentCache.deleteTempsFor(ctx, id) }

    private fun decryptBlocking(src: File, dst: File, hexKey: String, hexIv: String) {
        val done = CompletableFuture<Unit>()
        CryptoService.getInstance().decryptFile(
            src.absolutePath,
            dst.absolutePath,
            hexKey,
            hexIv,
            /* runInBackground = */ true,
        ) { err ->
            if (err != null) done.completeExceptionally(err) else done.complete(Unit)
        }
        try {
            done.get()
        } catch (e: java.util.concurrent.ExecutionException) {
            throw e.cause ?: e
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
