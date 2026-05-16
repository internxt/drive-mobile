package com.internxt.cloud.documents.api.model

data class DriveFolder(
    val uuid: String,
    val plainName: String,
    val parentUuid: String?,
    val bucket: String?,
    val createdAt: String?,
    val updatedAt: String?
)
