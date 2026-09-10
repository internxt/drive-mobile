package com.internxt.cloud.documents

import org.junit.Assert.assertEquals
import org.junit.Test

class MimeTypesTest {

    companion object {
        private const val APPLICATION_PDF = "application/pdf"
        private const val IMAGE_JPEG = "image/jpeg"
    }

    @Test
    fun mapsKnownExtensions() {
        assertEquals(APPLICATION_PDF, MimeTypes.fromExtension("pdf"))
        assertEquals(IMAGE_JPEG, MimeTypes.fromExtension("jpg"))
        assertEquals(IMAGE_JPEG, MimeTypes.fromExtension("jpeg"))
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
        assertEquals(APPLICATION_PDF, MimeTypes.fromExtension("PDF"))
        assertEquals(IMAGE_JPEG, MimeTypes.fromExtension("JPG"))
        assertEquals(IMAGE_JPEG, MimeTypes.fromExtension("Jpeg"))
    }

    @Test
    fun trimsWhitespace() {
        assertEquals(APPLICATION_PDF, MimeTypes.fromExtension("  pdf  "))
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
