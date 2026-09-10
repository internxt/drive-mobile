package com.internxt.cloud.documents.api

import com.internxt.cloud.documents.api.model.CreateFileEntry
import com.internxt.cloud.documents.api.model.ENCRYPT_VERSION_AES03
import com.internxt.cloud.documents.api.model.FinishUploadShard
import com.internxt.cloud.documents.api.model.UploadSlot
import com.internxt.cloud.documents.api.model.UploadedPart
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class InternxtApiClientUploadTest {

    private lateinit var server: MockWebServer
    private lateinit var client: InternxtApiClient

    companion object {
        private const val BUCKET_ID = "bucket-123"
        private const val PARENT_UUID = "parent-uuid-1"
        private const val SLOT_UUID = "slot-uuid"
        private const val BUCKET_FILE_ID = "bucket-file-id"
        private const val TIMESTAMP = "2026-05-25T00:00:00Z"
    }

    @Before
    fun setUp() {
        server = MockWebServer().apply { start() }
        val base = server.url("/").toString().trimEnd('/')
        client = InternxtApiClient(
            AuthConfig(
                driveBaseUrl = base,
                bridgeBaseUrl = base,
                bearerToken = "test-token",
                bridgeUser = "user@example.com",
                userId = "1234567890",
                mnemonic = "test mnemonic phrase",
                clientName = "drive-mobile",
                clientVersion = "v1.9.0",
                desktopToken = null,
            )
        )
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    private fun enqueue(body: String, code: Int = 200) {
        server.enqueue(MockResponse().setResponseCode(code).setBody(body))
    }

    @Test
    fun startUploadSinglePostsExpectedBodyAndParsesSlot() {
        enqueue(
            """{"uploads":[{"index":0,"uuid":"$SLOT_UUID","url":"https://shard/up"}]}"""
        )

        val response = client.startUpload(BUCKET_ID, encryptedSize = 4096, parts = 1)

        assertEquals(1, response.uploads.size)
        val slot = response.uploads[0]
        assertTrue("expected Single slot, got ${slot::class.simpleName}", slot is UploadSlot.Single)
        slot as UploadSlot.Single
        assertEquals(SLOT_UUID, slot.uuid)
        assertEquals("https://shard/up", slot.url)

        val recorded = server.takeRequest()
        assertEquals("POST", recorded.method)
        assertEquals("/v2/buckets/$BUCKET_ID/files/start?multiparts=1", recorded.path)
        val sent = JSONObject(recorded.body.readUtf8())
        val uploads = sent.getJSONArray("uploads")
        assertEquals(1, uploads.length())
        assertEquals(0, uploads.getJSONObject(0).getInt("index"))
        assertEquals(4096L, uploads.getJSONObject(0).getLong("size"))
        assertNotNull(recorded.getHeader("Authorization"))
        assertEquals(true, recorded.getHeader("Authorization")!!.startsWith("Basic "))
    }

    @Test
    fun startUploadMultipartPassesPartsCountAndParsesUrls() {
        enqueue(
            """{"uploads":[{"index":0,"uuid":"$SLOT_UUID","urls":["https://p/1","https://p/2","https://p/3"],"UploadId":"up-1"}]}"""
        )

        val response = client.startUpload(BUCKET_ID, encryptedSize = 300L * 1024L * 1024L, parts = 4)

        val slot = response.uploads.single()
        assertTrue("expected Multipart slot, got ${slot::class.simpleName}", slot is UploadSlot.Multipart)
        slot as UploadSlot.Multipart
        assertEquals(listOf("https://p/1", "https://p/2", "https://p/3"), slot.urls)
        assertEquals("up-1", slot.uploadId)

        val recorded = server.takeRequest()
        assertEquals("/v2/buckets/$BUCKET_ID/files/start?multiparts=4", recorded.path)
    }

    @Test
    fun finishUploadSingleShardBody() {
        enqueue("""{"id":"$BUCKET_FILE_ID","bucket":"$BUCKET_ID"}""")

        val finish = client.finishUpload(
            BUCKET_ID,
            indexHex = "ab".repeat(32),
            shards = listOf(FinishUploadShard(uuid = SLOT_UUID, hash = "deadbeef")),
        )

        assertEquals(BUCKET_FILE_ID, finish.id)
        assertEquals(BUCKET_ID, finish.bucket)

        val recorded = server.takeRequest()
        assertEquals("POST", recorded.method)
        assertEquals("/v2/buckets/$BUCKET_ID/files/finish", recorded.path)
        val sent = JSONObject(recorded.body.readUtf8())
        assertEquals("ab".repeat(32), sent.getString("index"))
        val shards = sent.getJSONArray("shards")
        assertEquals(1, shards.length())
        val shard = shards.getJSONObject(0)
        assertEquals(SLOT_UUID, shard.getString("uuid"))
        assertEquals("deadbeef", shard.getString("hash"))
        assertEquals(false, shard.has("UploadId"))
        assertEquals(false, shard.has("parts"))
    }

    @Test
    fun finishUploadMultipartIncludesUploadIdAndParts() {
        enqueue("""{"id":"$BUCKET_FILE_ID"}""")

        client.finishUpload(
            BUCKET_ID,
            indexHex = "cd".repeat(32),
            shards = listOf(
                FinishUploadShard(
                    uuid = SLOT_UUID,
                    hash = "deadbeef",
                    uploadId = "up-1",
                    parts = listOf(
                        UploadedPart(partNumber = 2, etag = "etag-2"),
                        UploadedPart(partNumber = 1, etag = "etag-1"),
                    ),
                )
            ),
        )

        val recorded = server.takeRequest()
        val shard = JSONObject(recorded.body.readUtf8()).getJSONArray("shards").getJSONObject(0)
        assertEquals("up-1", shard.getString("UploadId"))
        val parts = shard.getJSONArray("parts")
        assertEquals(2, parts.length())
        assertEquals(1, parts.getJSONObject(0).getInt("PartNumber"))
        assertEquals("etag-1", parts.getJSONObject(0).getString("ETag"))
        assertEquals(2, parts.getJSONObject(1).getInt("PartNumber"))
        assertEquals("etag-2", parts.getJSONObject(1).getString("ETag"))
    }

    @Test
    fun createFileEntryPostsToDriveFilesWithBearer() {
        enqueue("""{"uuid":"new-file-uuid","plainName":"report.pdf","type":"pdf","size":4096}""")

        val created = client.createFileEntry(
            CreateFileEntry(
                fileId = BUCKET_FILE_ID,
                type = "pdf",
                size = 4096L,
                plainName = "report.pdf",
                bucket = BUCKET_ID,
                folderUuid = PARENT_UUID,
                modificationTime = TIMESTAMP,
                creationTime = TIMESTAMP,
            )
        )

        assertEquals("new-file-uuid", created.uuid)

        val recorded = server.takeRequest()
        assertEquals("POST", recorded.method)
        assertEquals("/files", recorded.path)
        assertEquals("Bearer test-token", recorded.getHeader("Authorization"))
        val sent = JSONObject(recorded.body.readUtf8())
        assertEquals(BUCKET_FILE_ID, sent.getString("fileId"))
        assertEquals("pdf", sent.getString("type"))
        assertEquals(4096L, sent.getLong("size"))
        assertEquals("report.pdf", sent.getString("plainName"))
        assertEquals(BUCKET_ID, sent.getString("bucket"))
        assertEquals(PARENT_UUID, sent.getString("folderUuid"))
        assertEquals(ENCRYPT_VERSION_AES03, sent.getString("encryptVersion"))
        assertEquals(TIMESTAMP, sent.getString("modificationTime"))
        assertEquals(TIMESTAMP, sent.getString("creationTime"))
    }
}
