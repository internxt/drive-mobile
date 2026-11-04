package com.internxt.cloud.documents

import android.provider.DocumentsContract.Document
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test

class DocumentRowCacheTest {

    companion object {
        private const val FOLDER_UUID = "folder-uuid"
        private const val FILE_UUID = "file-uuid"
        private const val FOLDER_DOC_ID = "f:$FOLDER_UUID"
        private const val FILE_DOC_ID = "d:$FILE_UUID"
    }

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
        val folderRow = row(FOLDER_DOC_ID, "Documents")
        val fileRow = row(FILE_DOC_ID, "report.pdf")

        cache.putAll(listOf(folderRow, fileRow))

        assertEquals(folderRow, cache[FOLDER_UUID])
        assertEquals(fileRow, cache[FILE_UUID])
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
        cache.put(FILE_UUID, row(FILE_DOC_ID, "old.pdf"))
        val renamed = row(FILE_DOC_ID, "new.pdf")

        cache.put(FILE_UUID, renamed)

        assertEquals(renamed, cache[FILE_UUID])
    }

    @Test
    fun `when evict removes a uuid, then only that entry is gone`() {
        cache.putAll(listOf(row(FILE_DOC_ID), row(FOLDER_DOC_ID)))

        cache.evict(FILE_UUID)

        assertNull(cache[FILE_UUID])
        assertEquals(row(FOLDER_DOC_ID), cache[FOLDER_UUID])
    }

    @Test
    fun `when evictAll receives stale rows, then their uuids are removed and others remain`() {
        val staying = row("d:kept-uuid")
        cache.putAll(listOf(row(FILE_DOC_ID), row(FOLDER_DOC_ID), staying))

        cache.evictAll(listOf(row(FILE_DOC_ID), row(FOLDER_DOC_ID)))

        assertNull(cache[FILE_UUID])
        assertNull(cache[FOLDER_UUID])
        assertEquals(staying, cache["kept-uuid"])
    }

    @Test
    fun `when a uuid was never cached, then get returns null`() {
        assertNull(cache["missing-uuid"])
    }
}
