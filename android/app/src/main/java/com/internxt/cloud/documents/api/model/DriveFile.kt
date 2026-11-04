package com.internxt.cloud.documents.api.model

data class DriveFile(
    val uuid: String,
    val plainName: String,
    val type: String?,
    val size: Long,
    val bucket: String?,
    val folderUuid: String?,
    val createdAt: String?,
    val updatedAt: String?,
    val fileId: String?
)
