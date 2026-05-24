package com.internxt.cloud.documents.crypto

import org.junit.Assert.assertEquals
import org.junit.Test

class FileKeyDeriverTest {

    @Test
    fun deriveFileKeyMatchesDriveWebForCanonicalTriple() {
        val fileKey = FileKeyDeriver.deriveFileKey(MNEMONIC, BUCKET_ID, INDEX_HEX)
        assertEquals(EXPECTED_FILE_KEY_HEX, fileKey.toHex().lowercase())
    }

    @Test
    fun deriveIvMatchesFirst16BytesOfIndex() {
        val iv = FileKeyDeriver.deriveIv(INDEX_HEX)
        assertEquals(EXPECTED_IV_HEX, iv.toHex().lowercase())
    }

    companion object {
        private const val MNEMONIC =
            "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
        private const val BUCKET_ID = "a1b2c3d4e5f6a1b2c1d2e3f4a5b6c7d8"
        private const val INDEX_HEX =
            "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"

        private const val EXPECTED_FILE_KEY_HEX =
            "186473ae7deaa32c1b5b9b1c7708c2c29098f24664ece11abfff56839c630fbb"
        private const val EXPECTED_IV_HEX = "abcdef1234567890abcdef1234567890"
    }
}
