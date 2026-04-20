package com.internxt.cloud.documents.api

import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okhttp3.mockwebserver.SocketPolicy
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertThrows
import org.junit.Before
import org.junit.Test

class InternxtApiClientTest {

    private lateinit var server: MockWebServer
    private lateinit var client: InternxtApiClient

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
                userId = "1234567890"
            )
        )
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun listFolderFilesParsesResponseAndSendsBearerAndQuery() {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """
                {
                  "files": [
                    {
                      "uuid": "file-uuid-1",
                      "plainName": "report.pdf",
                      "type": "pdf",
                      "size": 102400,
                      "bucket": "bucket-id",
                      "folderUuid": "parent-uuid",
                      "createdAt": "2026-01-10T00:00:00.000Z",
                      "updatedAt": "2026-01-11T00:00:00.000Z",
                      "fileId": "file-id-1"
                    },
                    {
                      "uuid": "file-uuid-2",
                      "plainName": "photo.jpg",
                      "type": "jpg",
                      "size": 2048,
                      "bucket": "bucket-id",
                      "folderUuid": "parent-uuid",
                      "createdAt": "2026-01-12T00:00:00.000Z",
                      "updatedAt": "2026-01-12T00:00:00.000Z",
                      "fileId": "file-id-2"
                    }
                  ]
                }
                """.trimIndent()
            )
        )

        val files = client.listFolderFiles("parent-uuid")

        assertEquals(2, files.size)
        val first = files[0]
        assertEquals("file-uuid-1", first.uuid)
        assertEquals("report.pdf", first.plainName)
        assertEquals("pdf", first.type)
        assertEquals(102400L, first.size)
        assertEquals("bucket-id", first.bucket)
        assertEquals("parent-uuid", first.folderUuid)
        assertEquals("2026-01-10T00:00:00.000Z", first.createdAt)
        assertEquals("file-id-1", first.fileId)

        val recorded = server.takeRequest()
        assertEquals("GET", recorded.method)
        assertEquals("Bearer test-token", recorded.getHeader("Authorization"))
        assertEquals(
            "/folders/content/parent-uuid/files?offset=0&limit=50&sort=plainName&order=ASC",
            recorded.path
        )
    }

    @Test
    fun unauthorizedResponseSurfacesAsUnauthorizedException() {
        server.enqueue(MockResponse().setResponseCode(401).setBody("""{"error":"Invalid token"}"""))

        val ex = assertThrows(InternxtApiException.UnauthorizedException::class.java) {
            client.listFolderFiles("parent-uuid")
        }
        assertNotNull(ex.message)
    }

    @Test
    fun notFoundResponseSurfacesAsNotFoundException() {
        server.enqueue(MockResponse().setResponseCode(404).setBody(""))

        assertThrows(InternxtApiException.NotFoundException::class.java) {
            client.listFolderFiles("missing-uuid")
        }
    }

    @Test
    fun socketDisconnectSurfacesAsNetworkException() {
        server.enqueue(MockResponse().setSocketPolicy(SocketPolicy.DISCONNECT_AT_START))

        assertThrows(InternxtApiException.NetworkException::class.java) {
            client.listFolderFiles("parent-uuid")
        }
    }

    @Test
    fun driveRequestsIncludeGatewayHeaders() {
        val base = server.url("/").toString().trimEnd('/')
        val clientWithHeaders = InternxtApiClient(
            AuthConfig(
                driveBaseUrl = base,
                bridgeBaseUrl = base,
                bearerToken = "test-token",
                bridgeUser = "user@example.com",
                userId = "1234567890",
                clientName = "drive-mobile",
                clientVersion = "v1.9.0",
                desktopToken = "desktop-token-xyz"
            )
        )
        server.enqueue(MockResponse().setResponseCode(200).setBody("""{"files":[]}"""))

        clientWithHeaders.listFolderFiles("parent-uuid")

        val recorded = server.takeRequest()
        assertEquals("drive-mobile", recorded.getHeader("internxt-client"))
        assertEquals("v1.9.0", recorded.getHeader("internxt-version"))
        assertEquals("desktop-token-xyz", recorded.getHeader("x-internxt-desktop-header"))
    }

    @Test
    fun getDownloadLinksUsesBasicAuthWithDerivedBridgePass() {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """
                {
                  "bucket": "bucket-id",
                  "index": "idx",
                  "size": 1024,
                  "version": 2,
                  "shards": [
                    {"index":0,"size":512,"hash":"aa","url":"https://shard/0"},
                    {"index":1,"size":512,"hash":"bb","url":"https://shard/1"}
                  ]
                }
                """.trimIndent()
            )
        )

        val links = client.getDownloadLinks("bucket-id", "file-id-1")

        assertEquals(2, links.shards.size)
        assertEquals("https://shard/0", links.shards[0].url)
        assertEquals(512L, links.shards[0].size)

        val recorded = server.takeRequest()
        val auth = recorded.getHeader("Authorization") ?: error("missing auth")
        assertEquals(
            "Basic " + java.util.Base64.getEncoder().encodeToString(
                "user@example.com:c775e7b757ede630cd0aa1113bd102661ab38829ca52a6422ab782862f268646"
                    .toByteArray(Charsets.UTF_8)
            ),
            auth
        )
    }
}
