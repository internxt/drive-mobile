package com.internxt.cloud.documents.api.model

const val ENCRYPT_VERSION_AES03 = "Aes03"

data class CreateFileEntry(
    val fileId: String,
    val type: String,
    val size: Long,
    val plainName: String,
    val bucket: String,
    val folderUuid: String,
    val encryptVersion: String = ENCRYPT_VERSION_AES03,
    val modificationTime: String? = null,
    val creationTime: String? = null,
)
