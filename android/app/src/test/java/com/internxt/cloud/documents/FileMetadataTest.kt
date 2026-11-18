package com.internxt.cloud.documents

import com.internxt.cloud.documents.api.model.DriveFile
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import java.io.FileNotFoundException

class FileMetadataTest {

    private fun driveFile(
        fileId: String? = CONTENT_ID,
        bucket: String? = BUCKET,
        updatedAt: String? = UPDATED_AT,
    ) = DriveFile(
        uuid = "file-uuid",
        plainName = "notes",
        type = "txt",
        size = 0,
        bucket = bucket,
        folderUuid = "folder-uuid",
        createdAt = UPDATED_AT,
        updatedAt = updatedAt,
        fileId = fileId,
    )

    @Test
    fun `when an empty file has no content id, then its metadata is built without one`() {
        val metadata = FileMetadata.from(driveFile(fileId = null))

        assertNull(metadata.fileId)
        assertEquals(BUCKET, metadata.bucket)
        assertEquals(UPDATED_AT, metadata.updatedAt)
    }

    @Test
    fun `when a file has content, then its metadata keeps the content id`() {
        val metadata = FileMetadata.from(driveFile())

        assertEquals(CONTENT_ID, metadata.fileId)
    }

    @Test(expected = FileNotFoundException::class)
    fun `when a file has no bucket, then it is reported as not found`() {
        FileMetadata.from(driveFile(bucket = null))
    }

    @Test(expected = FileNotFoundException::class)
    fun `when a file has no update date, then it is reported as not found`() {
        FileMetadata.from(driveFile(updatedAt = null))
    }

    private companion object {
        const val CONTENT_ID = "content-id"
        const val BUCKET = "bucket-id"
        const val UPDATED_AT = "2026-10-20T10:00:00.000Z"
    }
}
