package com.internxt.cloud.documents

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking

/**
 * Bridges a binder thread to a suspending body, running it on [Dispatchers.IO].
 *
 * SAF entry points such as `openDocument` arrive on a binder thread governed by a StrictMode
 * policy that forbids blocking network. Some collaborators (e.g. the synchronous OkHttp calls in
 * InternxtApiClient) still block, so the body must not run on the caller thread or it trips
 * NetworkOnMainThreadException. Plain `runBlocking { }` would do exactly that.
 */
internal fun <T> runBlockingIo(body: suspend CoroutineScope.() -> T): T =
    runBlocking(Dispatchers.IO, body)
