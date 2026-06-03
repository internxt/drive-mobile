package com.internxt.cloud.documents

import java.util.UUID

/** Pure naming helpers shared by the folder and file branches of [InternxtDocumentsProvider.createDocument]. */
object DocumentNaming {

    private const val MAX_SUFFIX_ATTEMPTS = 1000

    /**
     * Returns [requested] if it is not already in [existing]; otherwise appends a
     * ` (n)` suffix (preserving any file extension) until a free name is found.
     */
    fun uniqueName(requested: String, existing: Set<String>): String {
        if (requested !in existing) return requested
        val (base, ext) = splitNameExt(requested)
        for (i in 1..MAX_SUFFIX_ATTEMPTS) {
            val candidate = "$base ($i)$ext"
            if (candidate !in existing) return candidate
        }
        // Backstop for the (practically impossible) case where 1..1000 are all taken —
        // the backend permits duplicate names, so a UUID-suffixed name is always safe.
        return "$base (${UUID.randomUUID()})$ext"
    }

    fun splitNameExt(name: String): Pair<String, String> {
        val dot = name.lastIndexOf('.')
        val hasExt = dot > 0 && dot < name.length - 1
        return if (hasExt) name.substring(0, dot) to name.substring(dot) else name to ""
    }

    fun joinNameType(plainName: String, type: String?): String =
        if (type.isNullOrBlank()) plainName else "$plainName.$type"
}
