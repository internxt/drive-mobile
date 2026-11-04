package com.internxt.cloud.documents.download

import com.internxt.cloud.documents.api.model.Shard
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.runTest
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.Dispatcher
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okhttp3.mockwebserver.RecordedRequest
import org.junit.After
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.io.File
import java.nio.file.Files
import kotlin.coroutines.cancellation.CancellationException

class EncryptedFileDownloaderTest {

    private lateinit var server: MockWebServer
    private lateinit var client: OkHttpClient
    private lateinit var tempDir: File

    @Before
    fun setUp() {
        server = MockWebServer().apply { start() }
        client = OkHttpClient()
        tempDir = Files.createTempDirectory("downloader-test").toFile()
    }

    @After
    fun tearDown() {
        server.shutdown()
        tempDir.deleteRecursively()
    }

    private fun shard(index: Int, path: String, size: Int): Shard =
        Shard(index = index, size = size.toLong(), hash = "h$index", url = server.url(path).toString())

    @Test
    fun `when shards are served out of order, then bytes are written in index order`() = runTest {
        val part0 = ByteArray(2_000) { it.toByte() }
        val part1 = ByteArray(1_500) { (it + 7).toByte() }
        server.enqueue(MockResponse().setResponseCode(200).setBody(okio.Buffer().write(part0)))
        server.enqueue(MockResponse().setResponseCode(200).setBody(okio.Buffer().write(part1)))
        val target = File(tempDir, "out.bin")

        val shards = listOf(shard(1, "/p1", part1.size), shard(0, "/p0", part0.size))
        EncryptedFileDownloader.download(client, shards, target)

        assertArrayEquals(part0 + part1, target.readBytes())
    }

    @Test
    fun `when the coroutine is cancelled mid transfer, then it raises cancellation not a network error`() {
        val requestReceived = CompletableDeferred<Unit>()
        server.dispatcher = object : Dispatcher() {
            override fun dispatch(request: RecordedRequest): MockResponse {
                requestReceived.complete(Unit)
                Thread.sleep(2_000)
                return MockResponse().setResponseCode(200).setBody("late")
            }
        }
        val target = File(tempDir, "cancel.bin")
        val shards = listOf(shard(0, "/slow", 4))
        val thrown = CompletableDeferred<Throwable>()

        runBlocking {
            val job = launch(Dispatchers.IO) {
                try {
                    EncryptedFileDownloader.download(client, shards, target)
                } catch (t: Throwable) {
                    thrown.complete(t)
                    throw t
                }
            }
            requestReceived.await()
            job.cancel()
            job.join()
        }

        assertTrue(
            "expected cancellation but got ${thrown.getCompleted().javaClass.name}",
            thrown.getCompleted() is CancellationException,
        )
    }
}
