package com.internxt.cloud.documents

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class DocumentNamingTest {

    @Test
    fun uniqueNameReturnsRequestedWhenNoCollision() {
        assertEquals(REPORTS, DocumentNaming.uniqueName(REPORTS, setOf("Photos", "Music")))
    }

    @Test
    fun uniqueNameAppendsSuffixOnCollision() {
        assertEquals("Reports (1)", DocumentNaming.uniqueName(REPORTS, setOf(REPORTS)))
    }

    @Test
    fun uniqueNameSkipsTakenSuffixes() {
        val existing = setOf(REPORTS, "Reports (1)", "Reports (2)")
        assertEquals("Reports (3)", DocumentNaming.uniqueName(REPORTS, existing))
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
        assertEquals(REPORT_PDF, DocumentNaming.joinNameType(REPORT, "pdf"))
    }

    @Test
    fun joinNameTypeWithoutTypeReturnsName() {
        assertEquals(REPORT, DocumentNaming.joinNameType(REPORT, null))
        assertEquals(REPORT, DocumentNaming.joinNameType(REPORT, ""))
    }

    @Test
    fun joinNameTypeDoesNotDuplicateExistingSuffix() {
        assertEquals(REPORT_PDF, DocumentNaming.joinNameType(REPORT_PDF, "pdf"))
    }

    @Test
    fun joinNameTypeTreatsExistingSuffixCaseInsensitively() {
        assertEquals("report.PDF", DocumentNaming.joinNameType("report.PDF", "pdf"))
    }

    @Test
    fun joinNameTypeRoundTripsSplitNameExt() {
        val (base, ext) = DocumentNaming.splitNameExt(REPORT_PDF)

        assertEquals(REPORT_PDF, DocumentNaming.joinNameType(base, ext.removePrefix(".")))
    }

    @Test
    fun extensionOfPrefersType() {
        assertEquals("pdf", DocumentNaming.extensionOf(REPORT, "pdf"))
    }

    @Test
    fun extensionOfFallsBackToPlainNameWhenTypeMissing() {
        assertEquals("pdf", DocumentNaming.extensionOf(REPORT_PDF, null))
        assertEquals("pdf", DocumentNaming.extensionOf(REPORT_PDF, ""))
    }

    @Test
    fun extensionOfIsNullWithoutAnyExtension() {
        assertNull(DocumentNaming.extensionOf(FOLDER_NAME, null))
    }

    @Test
    fun renameTargetWithExtensionRemovedKeepsBaseAndType() {
        assertEquals("images-8" to "images-8.jpeg", DocumentNaming.renameTarget("images-8", "jpeg"))
    }

    @Test
    fun renameTargetWithNewBaseAndSameExtension() {
        assertEquals("holiday" to HOLIDAY_JPEG, DocumentNaming.renameTarget(HOLIDAY_JPEG, "jpeg"))
    }

    @Test
    fun renameTargetWithChangedExtensionKeepsCurrentType() {
        assertEquals("holiday" to HOLIDAY_JPEG, DocumentNaming.renameTarget("holiday.png", "jpeg"))
    }

    @Test
    fun renameTargetBlankBaseIsInvalid() {
        assertNull(DocumentNaming.renameTarget("   ", "jpeg"))
        assertNull(DocumentNaming.renameTarget("", null))
    }

    @Test
    fun renameTargetWithoutTypeUsesBaseAsDisplayName() {
        assertEquals(NOTES to NOTES, DocumentNaming.renameTarget(NOTES, null))
    }

    companion object {
        private const val FOLDER_NAME = "My Folder"
        private const val HOLIDAY_JPEG = "holiday.jpeg"
        private const val NOTES = "notes"
        private const val REPORT = "report"
        private const val REPORTS = "Reports"
        private const val REPORT_PDF = "report.pdf"
    }
}
