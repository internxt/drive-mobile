package com.internxt.cloud.documents

import android.provider.DocumentsContract.Document
import com.internxt.cloud.documents.api.model.DriveFile
import com.internxt.cloud.documents.api.model.DriveFolder
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class DocumentRowBuilderTest {

    @Test
    fun folderRowFields() {
        val folder = DriveFolder(
            uuid = "folder-uuid",
            plainName = "Documents",
            parentUuid = "parent-uuid",
            bucket = null,
            createdAt = null,
            updatedAt = "2026-01-11T00:00:00.000Z",
        )

        val row = DocumentRowBuilder.folderRow(folder)

        assertEquals("folder-uuid", row[Document.COLUMN_DOCUMENT_ID])
        assertEquals(Document.MIME_TYPE_DIR, row[Document.COLUMN_MIME_TYPE])
        assertEquals("Documents", row[Document.COLUMN_DISPLAY_NAME])
        assertEquals(1768089600000L, row[Document.COLUMN_LAST_MODIFIED])
        assertEquals(Document.FLAG_DIR_SUPPORTS_CREATE, row[Document.COLUMN_FLAGS])
        assertNull(row[Document.COLUMN_SIZE])
    }

    @Test
    fun fileRowFields() {
        val file = DriveFile(
            uuid = "file-uuid",
            plainName = "report.pdf",
            type = "pdf",
            size = 102400L,
            bucket = "bucket-id",
            folderUuid = "parent-uuid",
            createdAt = null,
            updatedAt = "2026-01-11T00:00:00.000Z",
            fileId = "file-id-1",
        )

        val row = DocumentRowBuilder.fileRow(file)

        assertEquals("file-uuid", row[Document.COLUMN_DOCUMENT_ID])
        assertEquals("application/pdf", row[Document.COLUMN_MIME_TYPE])
        assertEquals("report.pdf", row[Document.COLUMN_DISPLAY_NAME])
        assertEquals(1768089600000L, row[Document.COLUMN_LAST_MODIFIED])
        assertEquals(0, row[Document.COLUMN_FLAGS])
        assertEquals(102400L, row[Document.COLUMN_SIZE])
    }

    @Test
    fun fileRowUnknownExtensionFallsBackToOctetStream() {
        val file = DriveFile(
            uuid = "file-uuid",
            plainName = "weird.xyz",
            type = "xyz",
            size = 0L,
            bucket = null,
            folderUuid = null,
            createdAt = null,
            updatedAt = null,
            fileId = null,
        )

        val row = DocumentRowBuilder.fileRow(file)

        assertEquals("application/octet-stream", row[Document.COLUMN_MIME_TYPE])
        assertEquals("weird.xyz", row[Document.COLUMN_DISPLAY_NAME])
        assertNull(row[Document.COLUMN_LAST_MODIFIED])
    }

    @Test
    fun folderRowOverloadFields() {
        val row = DocumentRowBuilder.folderRow("root-uuid", "Internxt Drive")

        assertEquals("root-uuid", row[Document.COLUMN_DOCUMENT_ID])
        assertEquals(Document.MIME_TYPE_DIR, row[Document.COLUMN_MIME_TYPE])
        assertEquals("Internxt Drive", row[Document.COLUMN_DISPLAY_NAME])
        assertNull(row[Document.COLUMN_LAST_MODIFIED])
        assertEquals(Document.FLAG_DIR_SUPPORTS_CREATE, row[Document.COLUMN_FLAGS])
        assertNull(row[Document.COLUMN_SIZE])
    }

    @Test
    fun parseIsoToMillisHandlesValidInput() {
        assertEquals(1768089600000L, DocumentRowBuilder.parseIsoToMillis("2026-01-11T00:00:00.000Z"))
    }

    @Test
    fun parseIsoToMillisHandlesNullAndBlank() {
        assertNull(DocumentRowBuilder.parseIsoToMillis(null))
        assertNull(DocumentRowBuilder.parseIsoToMillis(""))
        assertNull(DocumentRowBuilder.parseIsoToMillis("   "))
    }

    @Test
    fun parseIsoToMillisHandlesMalformed() {
        assertNull(DocumentRowBuilder.parseIsoToMillis("not-a-date"))
        assertNull(DocumentRowBuilder.parseIsoToMillis("2026-99-99"))
    }
}
