package com.internxt.cloud.documents.crypto

import com.rncrypto.util.OnlyErrorCallback
import java.io.IOException
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlinx.coroutines.suspendCancellableCoroutine

/**
 * Suspends until `CryptoService.encryptFile` / `decryptFile` (callback-based) reports an
 * outcome via [OnlyErrorCallback]. No thread is blocked waiting for the callback: the rn-crypto
 * callback resumes the coroutine. Any non-null error is surfaced as [IOException] preserving the
 * original cause.
 */
internal suspend inline fun awaitCryptoService(
    failureMessage: String,
    crossinline invoke: (OnlyErrorCallback) -> Unit,
) = suspendCancellableCoroutine { continuation ->
    invoke { err ->
        if (err != null) {
            continuation.resumeWithException((err as? IOException) ?: IOException(failureMessage, err))
        } else {
            continuation.resume(Unit)
        }
    }
}
