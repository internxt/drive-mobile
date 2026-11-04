package com.internxt.cloud.documents

object DocumentId {

    enum class Kind { FOLDER, FILE }

    data class Decoded(val kind: Kind, val uuid: String)

    private const val FOLDER_PREFIX = "f:"
    private const val FILE_PREFIX = "d:"
    const val UPLOAD_PREFIX = "u:"

    fun encodeFolder(uuid: String): String = FOLDER_PREFIX + uuid
    fun encodeFile(uuid: String): String = FILE_PREFIX + uuid
    fun encodeUpload(token: String): String = UPLOAD_PREFIX + token

    fun isUploadToken(id: String): Boolean = id.startsWith(UPLOAD_PREFIX)
    fun decodeUpload(id: String): String? =
        if (isUploadToken(id)) id.removePrefix(UPLOAD_PREFIX) else null

    fun decode(id: String): Decoded? = when {
        id.startsWith(FOLDER_PREFIX) -> Decoded(Kind.FOLDER, id.removePrefix(FOLDER_PREFIX))
        id.startsWith(FILE_PREFIX) -> Decoded(Kind.FILE, id.removePrefix(FILE_PREFIX))
        else -> null
    }
}
