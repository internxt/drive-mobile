package com.internxt.cloud.documents

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class BlockingIoTest {

    @Test
    fun `when bridging from the caller thread, then the body runs on a different IO thread`() {
        val callerThread = Thread.currentThread()

        val bodyThread = runBlockingIo { Thread.currentThread() }

        assertNotEquals(
            "body must not run on the caller (binder) thread, otherwise blocking network trips StrictMode",
            callerThread,
            bodyThread,
        )
        assertTrue(
            "expected an IO dispatcher thread but ran on ${bodyThread.name}",
            bodyThread.name.contains("DefaultDispatcher") || bodyThread.name.contains("IO"),
        )
    }

    @Test
    fun `when the body returns a value, then it is propagated to the caller`() {
        val result = runBlockingIo { 42 }

        assertEquals(42, result)
    }
}
