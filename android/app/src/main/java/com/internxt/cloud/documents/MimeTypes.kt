package com.internxt.cloud.documents

import android.webkit.MimeTypeMap

object MimeTypes {

    const val DEFAULT = "application/octet-stream"

    private val TABLE = mapOf(
        "pdf" to "application/pdf",
        "png" to "image/png",
        "jpg" to "image/jpeg",
        "jpeg" to "image/jpeg",
        "gif" to "image/gif",
        "webp" to "image/webp",
        "mp4" to "video/mp4",
        "mov" to "video/quicktime",
        "mp3" to "audio/mpeg",
        "wav" to "audio/wav",
        "txt" to "text/plain",
        "csv" to "text/csv",
        "json" to "application/json",
        "xml" to "application/xml",
        "html" to "text/html",
        "zip" to "application/zip",
        "doc" to "application/msword",
        "docx" to "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "xls" to "application/vnd.ms-excel",
        "xlsx" to "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "ppt" to "application/vnd.ms-powerpoint",
        "pptx" to "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    )

    fun fromExtension(type: String?): String {
        val key = type?.trim()?.lowercase().orEmpty()
        if (key.isEmpty()) return DEFAULT
        return TABLE[key] ?: lookupSystem(key) ?: DEFAULT
    }

    private fun lookupSystem(extension: String): String? = try {
        MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension)
    } catch (_: Throwable) {
        null
    }
}
