package com.internxt.cloud.documents

import org.junit.Assert.assertEquals
import org.junit.Test

class DocumentNamingTest {

    @Test
    fun uniqueNameReturnsRequestedWhenNoCollision() {
        assertEquals("Reports", DocumentNaming.uniqueName("Reports", setOf("Photos", "Music")))
    }

    @Test
    fun uniqueNameAppendsSuffixOnCollision() {
        assertEquals("Reports (1)", DocumentNaming.uniqueName("Reports", setOf("Reports")))
    }

    @Test
    fun uniqueNameSkipsTakenSuffixes() {
        val existing = setOf("Reports", "Reports (1)", "Reports (2)")
        assertEquals("Reports (3)", DocumentNaming.uniqueName("Reports", existing))
    }

    @Test
    fun uniqueNamePreservesFileExtension() {
        assertEquals("report (1).pdf", DocumentNaming.uniqueName("report.pdf", setOf("report.pdf")))
    }

    @Test
    fun uniqueNameForFolderHasNoExtension() {
        assertEquals("My Folder (1)", DocumentNaming.uniqueName("My Folder", setOf("My Folder")))
    }

    @Test
    fun splitNameExtSplitsOnLastDot() {
        assertEquals("archive.tar" to ".gz", DocumentNaming.splitNameExt("archive.tar.gz"))
    }

    @Test
    fun splitNameExtNoExtension() {
        assertEquals("My Folder" to "", DocumentNaming.splitNameExt("My Folder"))
    }

    @Test
    fun splitNameExtLeadingDotIsNotAnExtension() {
        assertEquals(".gitignore" to "", DocumentNaming.splitNameExt(".gitignore"))
    }

    @Test
    fun splitNameExtTrailingDotIsNotAnExtension() {
        assertEquals("name." to "", DocumentNaming.splitNameExt("name."))
    }

    @Test
    fun joinNameTypeAppendsType() {
        assertEquals("report.pdf", DocumentNaming.joinNameType("report", "pdf"))
    }

    @Test
    fun joinNameTypeWithoutTypeReturnsName() {
        assertEquals("report", DocumentNaming.joinNameType("report", null))
        assertEquals("report", DocumentNaming.joinNameType("report", ""))
    }
}
