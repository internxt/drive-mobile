package com.internxt.cloud.documents

import android.provider.DocumentsContract.Document
import java.util.concurrent.ConcurrentHashMap

internal class DocumentRowCache {

    private val rowsByUuid = ConcurrentHashMap<String, Map<String, Any?>>()

    operator fun get(uuid: String): Map<String, Any?>? = rowsByUuid[uuid]

    fun put(uuid: String, row: Map<String, Any?>) {
        rowsByUuid[uuid] = row
    }

    fun putAll(rows: List<Map<String, Any?>>) {
        rows.forEach { row -> uuidOf(row)?.let { rowsByUuid[it] = row } }
    }

    fun evict(uuid: String) {
        rowsByUuid.remove(uuid)
    }

    fun evictAll(rows: List<Map<String, Any?>>) {
        rows.forEach { row -> uuidOf(row)?.let(rowsByUuid::remove) }
    }

    private fun uuidOf(row: Map<String, Any?>): String? =
        (row[Document.COLUMN_DOCUMENT_ID] as? String)?.let { DocumentId.decode(it)?.uuid ?: it }
}
