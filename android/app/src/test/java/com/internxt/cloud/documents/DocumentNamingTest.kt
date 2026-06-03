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
        assertEquals("report (1).pdf", DocumentNaming.uniqueName(REPORT_PDF, setOf(REPORT_PDF)))
    }

    @Test
    fun uniqueNameForFolderHasNoExtension() {
        assertEquals("$FOLDER_NAME (1)", DocumentNaming.uniqueName(FOLDER_NAME, setOf(FOLDER_NAME)))
    }

    @Test
    fun splitNameExtSplitsOnLastDot() {
        assertEquals("archive.tar" to ".gz", DocumentNaming.splitNameExt("archive.tar.gz"))
    }

    @Test
    fun splitNameExtNoExtension() {
        assertEquals(FOLDER_NAME to "", DocumentNaming.splitNameExt(FOLDER_NAME))
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
        assertEquals(REPORT_PDF, DocumentNaming.joinNameType("report", "pdf"))
    }

    @Test
    fun joinNameTypeWithoutTypeReturnsName() {
        assertEquals("report", DocumentNaming.joinNameType("report", null))
        assertEquals("report", DocumentNaming.joinNameType("report", ""))
    }

    companion object {
        private const val FOLDER_NAME = "My Folder"
        private const val REPORT_PDF = "report.pdf"
    }
}
