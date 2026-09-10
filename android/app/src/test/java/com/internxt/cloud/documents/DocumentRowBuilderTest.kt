package com.internxt.cloud.documents

import android.provider.DocumentsContract.Document
import com.internxt.cloud.documents.api.model.DriveFile
import com.internxt.cloud.documents.api.model.DriveFolder
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class DocumentRowBuilderTest {

    companion object {
        private const val UPDATED_AT = "2026-01-11T00:00:00.000Z"
        private const val REPORT_PDF = "report.pdf"
        private const val PDF_MIME = "application/pdf"
        private const val PARENT_UUID = "parent-uuid"
    }

    private fun driveFile(plainName: String, type: String?) = DriveFile(
        uuid = "file-uuid",
        plainName = plainName,
        type = type,
        size = 0L,
        bucket = null,
        folderUuid = null,
        createdAt = null,
        updatedAt = null,
        fileId = null,
    )

    @Test
    fun folderRowFields() {
        val folder = DriveFolder(
            uuid = "folder-uuid",
            plainName = "Documents",
            parentUuid = PARENT_UUID,
            bucket = null,
            createdAt = null,
            updatedAt = UPDATED_AT,
        )

        val row = DocumentRowBuilder.folderRow(folder)

        assertEquals("f:folder-uuid", row[Document.COLUMN_DOCUMENT_ID])
        assertEquals(Document.MIME_TYPE_DIR, row[Document.COLUMN_MIME_TYPE])
        assertEquals("Documents", row[Document.COLUMN_DISPLAY_NAME])
        assertEquals(1768089600000L, row[Document.COLUMN_LAST_MODIFIED])
        val expectedFolderFlags = Document.FLAG_DIR_SUPPORTS_CREATE or
            Document.FLAG_SUPPORTS_RENAME or
            Document.FLAG_SUPPORTS_DELETE or
            Document.FLAG_SUPPORTS_MOVE
        assertEquals(expectedFolderFlags, row[Document.COLUMN_FLAGS])
        assertNull(row[Document.COLUMN_SIZE])
        assertEquals(PARENT_UUID, row[DocumentRowBuilder.COLUMN_PARENT_UUID])
    }

    @Test
    fun fileRowFields() {
        val file = DriveFile(
            uuid = "file-uuid",
            plainName = "report",
            type = "pdf",
            size = 102400L,
            bucket = "bucket-id",
            folderUuid = PARENT_UUID,
            createdAt = null,
            updatedAt = UPDATED_AT,
            fileId = "file-id-1",
        )

        val row = DocumentRowBuilder.fileRow(file)

        assertEquals("d:file-uuid", row[Document.COLUMN_DOCUMENT_ID])
        assertEquals(PDF_MIME, row[Document.COLUMN_MIME_TYPE])
        assertEquals(REPORT_PDF, row[Document.COLUMN_DISPLAY_NAME])
        assertEquals(1768089600000L, row[Document.COLUMN_LAST_MODIFIED])
        val expectedFileFlags = Document.FLAG_SUPPORTS_RENAME or
            Document.FLAG_SUPPORTS_DELETE or
            Document.FLAG_SUPPORTS_MOVE
        assertEquals(expectedFileFlags, row[Document.COLUMN_FLAGS])
        assertEquals(102400L, row[Document.COLUMN_SIZE])
        assertEquals(PARENT_UUID, row[DocumentRowBuilder.COLUMN_PARENT_UUID])
    }

    @Test
    fun fileRowJoinsPlainNameAndType() {
        val row = DocumentRowBuilder.fileRow(driveFile("report", "pdf"))

        assertEquals(REPORT_PDF, row[Document.COLUMN_DISPLAY_NAME])
        assertEquals(PDF_MIME, row[Document.COLUMN_MIME_TYPE])
    }

    @Test
    fun fileRowDoesNotDuplicateExtensionAlreadyInPlainName() {
        val row = DocumentRowBuilder.fileRow(driveFile(REPORT_PDF, "PDF"))

        assertEquals(REPORT_PDF, row[Document.COLUMN_DISPLAY_NAME])
        assertEquals(PDF_MIME, row[Document.COLUMN_MIME_TYPE])
    }

    @Test
    fun fileRowWithNullTypeKeepsPlainNameAndDerivesMime() {
        val row = DocumentRowBuilder.fileRow(driveFile(REPORT_PDF, null))

        assertEquals(REPORT_PDF, row[Document.COLUMN_DISPLAY_NAME])
        assertEquals(PDF_MIME, row[Document.COLUMN_MIME_TYPE])
    }

    @Test
    fun fileRowUnknownExtensionFallsBackToOctetStream() {
        val row = DocumentRowBuilder.fileRow(driveFile("weird.xyz", "xyz"))

        assertEquals("application/octet-stream", row[Document.COLUMN_MIME_TYPE])
        assertEquals("weird.xyz", row[Document.COLUMN_DISPLAY_NAME])
        assertNull(row[Document.COLUMN_LAST_MODIFIED])
    }

    @Test
    fun folderRowOverloadFields() {
        val row = DocumentRowBuilder.folderRow("root-uuid", "Internxt Drive")

        assertEquals("f:root-uuid", row[Document.COLUMN_DOCUMENT_ID])
        assertEquals(Document.MIME_TYPE_DIR, row[Document.COLUMN_MIME_TYPE])
        assertEquals("Internxt Drive", row[Document.COLUMN_DISPLAY_NAME])
        assertNull(row[Document.COLUMN_LAST_MODIFIED])
        assertEquals(Document.FLAG_DIR_SUPPORTS_CREATE, row[Document.COLUMN_FLAGS])
        assertNull(row[Document.COLUMN_SIZE])
    }

    @Test
    fun parseIsoToMillisHandlesValidInput() {
        assertEquals(1768089600000L, DocumentRowBuilder.parseIsoToMillis(UPDATED_AT))
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
