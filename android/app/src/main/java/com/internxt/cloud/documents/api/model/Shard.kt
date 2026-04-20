package com.internxt.cloud.documents.api.model

data class Shard(
    val index: Int,
    val size: Long,
    val hash: String,
    val url: String
)
