package com.internxt.cloud.documents

import android.provider.DocumentsContract.Document
import com.internxt.cloud.documents.api.model.DriveFile
import com.internxt.cloud.documents.api.model.DriveFolder
import java.time.Instant
import java.time.format.DateTimeParseException

object DocumentRowBuilder {

    private const val FOLDER_FLAGS = Document.FLAG_DIR_SUPPORTS_CREATE
    private const val FILE_FLAGS = 0

    fun folderRow(folder: DriveFolder): Map<String, Any?> = folderRow(
        uuid = folder.uuid,
        displayName = folder.plainName,
        lastModified = parseIsoToMillis(folder.updatedAt),
    )

    fun folderRow(uuid: String, displayName: String, lastModified: Long? = null): Map<String, Any?> = mapOf(
        Document.COLUMN_DOCUMENT_ID to uuid,
        Document.COLUMN_MIME_TYPE to Document.MIME_TYPE_DIR,
        Document.COLUMN_DISPLAY_NAME to displayName,
        Document.COLUMN_LAST_MODIFIED to lastModified,
        Document.COLUMN_FLAGS to FOLDER_FLAGS,
        Document.COLUMN_SIZE to null,
    )

    fun fileRow(file: DriveFile): Map<String, Any?> = mapOf(
        Document.COLUMN_DOCUMENT_ID to file.uuid,
        Document.COLUMN_MIME_TYPE to MimeTypes.fromExtension(file.type),
        Document.COLUMN_DISPLAY_NAME to file.plainName,
        Document.COLUMN_LAST_MODIFIED to parseIsoToMillis(file.updatedAt),
        Document.COLUMN_FLAGS to FILE_FLAGS,
        Document.COLUMN_SIZE to file.size,
    )

    internal fun parseIsoToMillis(iso: String?): Long? {
        if (iso.isNullOrBlank()) return null
        return try {
            Instant.parse(iso).toEpochMilli()
        } catch (_: DateTimeParseException) {
            null
        }
    }
}
