package com.internxt.cloud.documents.crypto

import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import java.io.IOException

class CryptoServiceAwaitTest {

    @Test
    fun `when the callback reports no error, then it resumes without throwing`() = runTest {
        awaitCryptoService("should not surface") { cb -> cb.onComplete(null) }
    }

    @Test
    fun `when the callback reports an IOException, then it surfaces it as an IOException`() = runTest {
        val original = IOException("boom")

        val thrown = runCatching {
            awaitCryptoService(CRYPTO_FAILED_MESSAGE) { cb -> cb.onComplete(original) }
        }.exceptionOrNull()

        val io = thrown as? IOException ?: return@runTest fail("expected IOException but got $thrown")
        assertEquals("boom", io.message)
    }

    @Test
    fun `when the callback reports a non-IO error, then it wraps it in an IOException keeping the cause`() = runTest {
        val original = IllegalStateException("nope")

        val thrown = runCatching {
            awaitCryptoService(CRYPTO_FAILED_MESSAGE) { cb -> cb.onComplete(original) }
        }.exceptionOrNull()

        val io = thrown as? IOException ?: return@runTest fail("expected IOException but got $thrown")
        assertEquals(CRYPTO_FAILED_MESSAGE, io.message)
        assertTrue("original cause not preserved in chain", io.hasCauseWithMessage("nope"))
    }

    private fun Throwable.hasCauseWithMessage(message: String): Boolean {
        var current: Throwable? = cause
        while (current != null) {
            if (current.message == message) return true
            current = current.cause
        }
        return false
    }

    companion object {
        private const val CRYPTO_FAILED_MESSAGE = "crypto failed"
    }
}
