package com.internxt.cloud.documents

import android.provider.DocumentsContract.Document
import com.internxt.cloud.documents.api.model.DriveFile
import com.internxt.cloud.documents.api.model.DriveFolder
import java.time.Instant
import java.time.format.DateTimeParseException

object DocumentRowBuilder {

    private const val MUTATION_FLAGS =
        Document.FLAG_SUPPORTS_RENAME or
            Document.FLAG_SUPPORTS_DELETE or
            Document.FLAG_SUPPORTS_MOVE

    private const val FOLDER_FLAGS_BASIC = Document.FLAG_DIR_SUPPORTS_CREATE
    private const val FOLDER_FLAGS = FOLDER_FLAGS_BASIC or MUTATION_FLAGS
    private const val FILE_FLAGS = MUTATION_FLAGS

    const val COLUMN_PARENT_UUID = "internxt_parent_uuid"

    fun folderRow(folder: DriveFolder): Map<String, Any?> = mapOf(
        Document.COLUMN_DOCUMENT_ID to DocumentId.encodeFolder(folder.uuid),
        Document.COLUMN_MIME_TYPE to Document.MIME_TYPE_DIR,
        Document.COLUMN_DISPLAY_NAME to folder.plainName,
        Document.COLUMN_LAST_MODIFIED to parseIsoToMillis(folder.updatedAt),
        Document.COLUMN_FLAGS to FOLDER_FLAGS,
        Document.COLUMN_SIZE to null,
        COLUMN_PARENT_UUID to folder.parentUuid,
    )

    fun folderRow(uuid: String, displayName: String, lastModified: Long? = null): Map<String, Any?> = mapOf(
        Document.COLUMN_DOCUMENT_ID to DocumentId.encodeFolder(uuid),
        Document.COLUMN_MIME_TYPE to Document.MIME_TYPE_DIR,
        Document.COLUMN_DISPLAY_NAME to displayName,
        Document.COLUMN_LAST_MODIFIED to lastModified,
        Document.COLUMN_FLAGS to FOLDER_FLAGS_BASIC,
        Document.COLUMN_SIZE to null,
    )

    fun fileRow(file: DriveFile): Map<String, Any?> = mapOf(
        Document.COLUMN_DOCUMENT_ID to DocumentId.encodeFile(file.uuid),
        Document.COLUMN_MIME_TYPE to MimeTypes.fromExtension(DocumentNaming.extensionOf(file.plainName, file.type)),
        Document.COLUMN_DISPLAY_NAME to DocumentNaming.joinNameType(file.plainName, file.type),
        Document.COLUMN_LAST_MODIFIED to parseIsoToMillis(file.updatedAt),
        Document.COLUMN_FLAGS to FILE_FLAGS,
        Document.COLUMN_SIZE to file.size,
        COLUMN_PARENT_UUID to file.folderUuid,
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
