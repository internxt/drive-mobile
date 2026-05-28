package com.internxt.cloud.documents.api.model

data class UploadStartResponse(
    val uploads: List<UploadSlot>,
)

sealed class UploadSlot {
    abstract val index: Int
    abstract val uuid: String

    data class Single(
        override val index: Int,
        override val uuid: String,
        val url: String,
    ) : UploadSlot()

    data class Multipart(
        override val index: Int,
        override val uuid: String,
        val urls: List<String>,
        val uploadId: String,
    ) : UploadSlot()
}
