package com.internxt.cloud.documents.api.model

data class DownloadLinks(
    val bucket: String,
    val index: String,
    val size: Long,
    val version: Int,
    val shards: List<Shard>
)
