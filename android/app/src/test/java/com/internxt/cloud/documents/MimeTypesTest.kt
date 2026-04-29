package com.internxt.cloud.documents

import org.junit.Assert.assertEquals
import org.junit.Test

class MimeTypesTest {

    @Test
    fun mapsKnownExtensions() {
        assertEquals("application/pdf", MimeTypes.fromExtension("pdf"))
        assertEquals("image/jpeg", MimeTypes.fromExtension("jpg"))
        assertEquals("image/jpeg", MimeTypes.fromExtension("jpeg"))
        assertEquals("image/png", MimeTypes.fromExtension("png"))
        assertEquals("video/mp4", MimeTypes.fromExtension("mp4"))
        assertEquals("audio/mpeg", MimeTypes.fromExtension("mp3"))
        assertEquals("application/zip", MimeTypes.fromExtension("zip"))
        assertEquals(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            MimeTypes.fromExtension("xlsx")
        )
    }

    @Test
    fun isCaseInsensitive() {
        assertEquals("application/pdf", MimeTypes.fromExtension("PDF"))
        assertEquals("image/jpeg", MimeTypes.fromExtension("JPG"))
        assertEquals("image/jpeg", MimeTypes.fromExtension("Jpeg"))
    }

    @Test
    fun trimsWhitespace() {
        assertEquals("application/pdf", MimeTypes.fromExtension("  pdf  "))
    }

    @Test
    fun unknownExtensionFallsBackToOctetStream() {
        assertEquals(MimeTypes.DEFAULT, MimeTypes.fromExtension("xyz"))
        assertEquals("application/octet-stream", MimeTypes.fromExtension("xyz"))
    }

    @Test
    fun nullAndBlankFallBackToOctetStream() {
        assertEquals(MimeTypes.DEFAULT, MimeTypes.fromExtension(null))
        assertEquals(MimeTypes.DEFAULT, MimeTypes.fromExtension(""))
        assertEquals(MimeTypes.DEFAULT, MimeTypes.fromExtension("   "))
    }
}
