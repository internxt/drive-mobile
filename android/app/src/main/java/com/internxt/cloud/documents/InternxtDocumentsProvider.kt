package com.internxt.cloud.documents

import android.database.Cursor
import android.database.MatrixCursor
import android.os.CancellationSignal
import android.os.ParcelFileDescriptor
import android.provider.DocumentsContract.Document
import android.provider.DocumentsContract.Root
import android.provider.DocumentsProvider
import com.internxt.cloud.R

class InternxtDocumentsProvider : DocumentsProvider() {

    override fun onCreate(): Boolean = true

    override fun queryRoots(projection: Array<String>?): Cursor {
        val cursor = MatrixCursor(resolveRootProjection(projection))
        cursor.newRow().apply {
            add(Root.COLUMN_ROOT_ID, ROOT_ID)
            add(Root.COLUMN_DOCUMENT_ID, ROOT_DOCUMENT_ID)
            add(Root.COLUMN_TITLE, context?.getString(R.string.documents_provider_label))
            add(Root.COLUMN_FLAGS, 0)
            add(Root.COLUMN_ICON, R.mipmap.ic_launcher)
        }
        return cursor
    }

    override fun queryDocument(documentId: String?, projection: Array<String>?): Cursor =
        MatrixCursor(resolveDocumentProjection(projection))

    override fun queryChildDocuments(
        parentDocumentId: String?,
        projection: Array<String>?,
        sortOrder: String?
    ): Cursor = MatrixCursor(resolveDocumentProjection(projection))

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
        private const val ROOT_ID = "root"
        private const val ROOT_DOCUMENT_ID = "root"

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
