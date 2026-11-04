package com.internxt.cloud.documents.crypto

import org.junit.Assert.assertEquals
import org.junit.Test

class HashUtilTest {

    @Test
    fun derivesSha256HexMatchingJsReference() {
        assertEquals(
            "c775e7b757ede630cd0aa1113bd102661ab38829ca52a6422ab782862f268646",
            HashUtil.deriveBridgePass("1234567890")
        )
    }

    @Test
    fun derivesSha256HexForUuidShapedUserId() {
        assertEquals(
            "70f333dce10c05a12f6b6f372aa31a182d1e6a8d38d2041c94c9814606a653fe",
            HashUtil.deriveBridgePass("79a88429-b45a-4ae7-90f1-c351b6882670")
        )
    }

    @Test
    fun producesLowercaseHex() {
        val hex = HashUtil.deriveBridgePass("abc")
        assertEquals(hex.lowercase(), hex)
        assertEquals(64, hex.length)
    }
}
