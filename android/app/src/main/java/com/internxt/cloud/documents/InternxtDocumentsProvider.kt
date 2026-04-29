package com.internxt.cloud.documents

import android.database.Cursor
import android.database.MatrixCursor
import android.os.CancellationSignal
import android.os.ParcelFileDescriptor
import android.provider.DocumentsContract
import android.provider.DocumentsContract.Document
import android.provider.DocumentsContract.Root
import android.provider.DocumentsProvider
import android.util.Log
import com.internxt.cloud.R
import com.internxt.cloud.documents.api.InternxtApiClient
import com.internxt.cloud.documents.api.InternxtApiException
import com.internxt.cloud.documents.auth.InternxtAuthManager

class InternxtDocumentsProvider : DocumentsProvider() {

    private lateinit var authManager: InternxtAuthManager

    override fun onCreate(): Boolean {
        authManager = InternxtAuthManager.create(context!!.applicationContext)
        return true
    }

    override fun queryRoots(projection: Array<String>?): Cursor {
        val cursor = MatrixCursor(resolveRootProjection(projection))
        val ctx = context ?: return cursor
        cursor.setNotificationUri(ctx.contentResolver, DocumentsContract.buildRootsUri(AUTHORITY))

        val rootUuid = authManager.authenticatedRootUuid() ?: return cursor

        cursor.newRow().apply {
            add(Root.COLUMN_ROOT_ID, ROOT_ID)
            add(Root.COLUMN_DOCUMENT_ID, rootUuid)
            add(Root.COLUMN_TITLE, ctx.getString(R.string.documents_provider_label))
            authManager.userEmail()?.let { add(Root.COLUMN_SUMMARY, it) }
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

        if (id == authManager.authenticatedRootUuid()) {
            cursor.addDocumentRow(
                DocumentRowBuilder.folderRow(id, ctx.getString(R.string.documents_provider_label))
            )
            return cursor
        }

        val api = apiClient(op = "queryDocument")
        val row = if (api == null) null else try {
            api.getFolder(id)?.let { DocumentRowBuilder.folderRow(it) }
                ?: api.getFile(id)?.let { DocumentRowBuilder.fileRow(it) }
        } catch (e: InternxtApiException) {
            Log.w(TAG, "queryDocument id=$id failed: ${e.javaClass.simpleName}: ${e.message}")
            null
        }

        cursor.addDocumentRow(row ?: DocumentRowBuilder.folderRow(uuid = id, displayName = id))
        return cursor
    }

    override fun queryChildDocuments(
        parentDocumentId: String?,
        projection: Array<String>?,
        sortOrder: String?
    ): Cursor {
        val cursor = MatrixCursor(resolveDocumentProjection(projection))
        val ctx = context ?: return cursor
        val parent = parentDocumentId ?: return cursor
        cursor.setNotificationUri(
            ctx.contentResolver,
            DocumentsContract.buildChildDocumentsUri(AUTHORITY, parent)
        )
        Log.d(TAG, "queryChildDocuments parent=$parent")

        val api = apiClient(op = "queryChildDocuments") ?: return cursor

        try {
            paginate({ offset, size -> api.listFolderFolders(parent, offset, size) }) {
                cursor.addDocumentRow(DocumentRowBuilder.folderRow(it))
            }
            paginate({ offset, size -> api.listFolderFiles(parent, offset, size) }) {
                cursor.addDocumentRow(DocumentRowBuilder.fileRow(it))
            }
            Log.d(TAG, "queryChildDocuments parent=$parent rows=${cursor.count}")
        } catch (e: InternxtApiException) {
            Log.w(TAG, "queryChildDocuments parent=$parent failed: ${e.javaClass.simpleName}: ${e.message}")
            return cursor
        }

        return cursor
    }

    private fun apiClient(op: String): InternxtApiClient? {
        val cfg = authManager.loadAuthConfig()
        if (cfg == null) {
            Log.w(TAG, "$op: loadAuthConfig() returned null")
            return null
        }
        return InternxtApiClient(cfg)
    }

    private inline fun <T> paginate(fetch: (offset: Int, size: Int) -> List<T>, onItem: (T) -> Unit) {
        val pageSize = InternxtApiClient.DEFAULT_PAGE_SIZE
        var offset = 0
        while (true) {
            val page = fetch(offset, pageSize)
            page.forEach(onItem)
            if (page.size < pageSize) break
            offset += pageSize
        }
    }

    private fun MatrixCursor.addDocumentRow(row: Map<String, Any?>) {
        val builder = newRow()
        row.forEach { (column, value) -> builder.add(column, value) }
    }

    override fun openDocument(
        documentId: String?,
        mode: String?,
        signal: CancellationSignal?
    ): ParcelFileDescriptor {
        throw UnsupportedOperationException("Not implemented yet")
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
