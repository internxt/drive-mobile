package com.internxt.cloud.documents

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class DocumentAncestryTest {

    private val tree = mapOf(PARENT to "root", CHILD to PARENT, "grandchild" to CHILD, "other" to "root")

    private fun isDescendant(child: String, parent: String, parentOf: (String) -> String? = tree::get) =
        DocumentAncestry.isDescendant(child, parent, parentOf)

    @Test
    fun `when child and parent are the same id, then it is a descendant`() {
        assertTrue(isDescendant(CHILD, CHILD))
    }

    @Test
    fun `when the document is a direct child, then it is a descendant`() {
        assertTrue(isDescendant(CHILD, PARENT))
    }

    @Test
    fun `when the document is a grandchild, then it is a descendant`() {
        assertTrue(isDescendant("grandchild", PARENT))
    }

    @Test
    fun `when the document lives under another branch, then it is not a descendant`() {
        assertFalse(isDescendant("other", PARENT))
    }

    @Test
    fun `when the parent chain has a cycle, then the walk stops and returns false`() {
        assertFalse(isDescendant(CHILD, "root") { mapOf(CHILD to PARENT, PARENT to CHILD)[it] })
    }

    private companion object {
        const val PARENT = "parent"
        const val CHILD = "child"
    }
}
