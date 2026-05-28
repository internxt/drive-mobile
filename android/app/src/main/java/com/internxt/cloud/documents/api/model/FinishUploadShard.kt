package com.internxt.cloud.documents.api.model

data class FinishUploadShard(
    val uuid: String,
    val hash: String,
    val uploadId: String? = null,
    val parts: List<UploadedPart>? = null,
)
