package com.internxt.cloud.documents

import com.internxt.cloud.documents.api.model.DriveFile
import java.io.FileNotFoundException

/** The fields [InternxtDocumentsProvider.openDocument] needs to read a file's content. */
internal data class FileMetadata(
    val bucket: String,
    val fileId: String?,
    val updatedAt: String,
) {
    companion object {
        /**
         * Builds the metadata of [file]; [fileId] is null when the file has no content.
         * Throws [FileNotFoundException] if [file] has no bucket or no updatedAt.
         */
        fun from(file: DriveFile): FileMetadata = FileMetadata(
            bucket = file.bucket ?: throw FileNotFoundException("File ${file.uuid} has no bucket"),
            fileId = file.fileId,
            updatedAt = file.updatedAt ?: throw FileNotFoundException("File ${file.uuid} has no updatedAt"),
        )
    }
}
