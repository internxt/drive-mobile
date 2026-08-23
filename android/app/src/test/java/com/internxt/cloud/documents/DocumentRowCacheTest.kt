package com.internxt.cloud.documents

import android.provider.DocumentsContract.Document
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test

class DocumentRowCacheTest {

    private lateinit var cache: DocumentRowCache

    @Before
    fun setUp() {
        cache = DocumentRowCache()
    }

    private fun row(documentId: String?, displayName: String = "name") = mapOf(
        Document.COLUMN_DOCUMENT_ID to documentId,
        Document.COLUMN_DISPLAY_NAME to displayName,
    )

    @Test
    fun `when putAll receives listing rows, then they are retrievable by decoded uuid`() {
        val folderRow = row("f:folder-uuid", "Documents")
        val fileRow = row("d:file-uuid", "report.pdf")

        cache.putAll(listOf(folderRow, fileRow))

        assertEquals(folderRow, cache["folder-uuid"])
        assertEquals(fileRow, cache["file-uuid"])
    }

    @Test
    fun `when a row has an unprefixed document id, then it is keyed by the raw id`() {
        val bareRow = row("bare-uuid")

        cache.putAll(listOf(bareRow))

        assertEquals(bareRow, cache["bare-uuid"])
    }

    @Test
    fun `when a row has no document id, then it is skipped`() {
        cache.putAll(listOf(row(documentId = null)))

        assertNull(cache["null"])
    }

    @Test
    fun `when put stores a row under a uuid, then a later put overwrites it`() {
        cache.put("file-uuid", row("d:file-uuid", "old.pdf"))
        val renamed = row("d:file-uuid", "new.pdf")

        cache.put("file-uuid", renamed)

        assertEquals(renamed, cache["file-uuid"])
    }

    @Test
    fun `when evict removes a uuid, then only that entry is gone`() {
        cache.putAll(listOf(row("d:file-uuid"), row("f:folder-uuid")))

        cache.evict("file-uuid")

        assertNull(cache["file-uuid"])
        assertEquals(row("f:folder-uuid"), cache["folder-uuid"])
    }

    @Test
    fun `when evictAll receives stale rows, then their uuids are removed and others remain`() {
        val staying = row("d:kept-uuid")
        cache.putAll(listOf(row("d:file-uuid"), row("f:folder-uuid"), staying))

        cache.evictAll(listOf(row("d:file-uuid"), row("f:folder-uuid")))

        assertNull(cache["file-uuid"])
        assertNull(cache["folder-uuid"])
        assertEquals(staying, cache["kept-uuid"])
    }

    @Test
    fun `when a uuid was never cached, then get returns null`() {
        assertNull(cache["missing-uuid"])
    }
}
