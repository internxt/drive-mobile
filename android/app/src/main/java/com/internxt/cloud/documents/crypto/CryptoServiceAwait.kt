package com.internxt.cloud.documents.crypto

import com.rncrypto.util.OnlyErrorCallback
import java.io.IOException
import java.util.concurrent.CompletableFuture
import java.util.concurrent.ExecutionException

/**
 * Bridges `CryptoService.encryptFile` / `decryptFile` (callback-based) to a blocking call.
 * Pass `runInBackground = false` to those methods — the caller is already on a background
 * executor thread, so there's no point bouncing onto the rn-crypto thread pool just to
 * block on it. Any [Throwable] surfaced by the callback is rethrown as [IOException]
 * preserving the original cause.
 */
internal inline fun awaitCryptoService(
    failureMessage: String,
    invoke: (OnlyErrorCallback) -> Unit,
) {
    val done = CompletableFuture<Unit>()
    invoke { err -> if (err != null) done.completeExceptionally(err) else done.complete(Unit) }
    try {
        done.get()
    } catch (e: ExecutionException) {
        throw (e.cause as? IOException) ?: IOException(failureMessage, e.cause)
    }
}
