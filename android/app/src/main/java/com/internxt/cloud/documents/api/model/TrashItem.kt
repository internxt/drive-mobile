package com.internxt.cloud.documents.api.model

data class TrashItem(
    val uuid: String,
    val type: Type
) {
    enum class Type(val wire: String) {
        FILE("file"),
        FOLDER("folder");
    }
}
