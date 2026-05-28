package com.internxt.cloud.documents.upload

data class PendingUpload(
    val parentUuid: String,
    val plainName: String,
    val mimeType: String,
    val createdAtMillis: Long = System.currentTimeMillis(),
)
