package com.internxt.cloud.documents.api

import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okhttp3.mockwebserver.SocketPolicy
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Before
import org.junit.Test

class InternxtApiClientTest {

    private lateinit var server: MockWebServer
    private lateinit var client: InternxtApiClient

    companion object {
        private const val PARENT_UUID = "parent-uuid"
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
                desktopToken = "desktop-token-xyz"
            )
        )
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun listFolderFilesParsesResponseFields() {
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
                      "folderUuid": "$PARENT_UUID",
                      "createdAt": "2026-01-10T00:00:00.000Z",
                      "updatedAt": "2026-01-11T00:00:00.000Z",
                      "fileId": "file-id-1"
                    }
                  ]
                }
                """.trimIndent()
            )
        )

        val files = client.listFolderFiles(PARENT_UUID)

        assertEquals(1, files.size)
        val file = files[0]
        assertEquals("file-uuid-1", file.uuid)
        assertEquals("report.pdf", file.plainName)
        assertEquals("pdf", file.type)
        assertEquals(102400L, file.size)
        assertEquals("bucket-id", file.bucket)
        assertEquals(PARENT_UUID, file.folderUuid)
        assertEquals("2026-01-10T00:00:00.000Z", file.createdAt)
        assertEquals("file-id-1", file.fileId)
    }

    @Test
    fun listFolderFilesBuildsAuthenticatedDriveRequest() {
        server.enqueue(MockResponse().setResponseCode(200).setBody("""{"files":[]}"""))

        client.listFolderFiles(PARENT_UUID)

        val recorded = server.takeRequest()
        assertEquals("GET", recorded.method)
        assertEquals(
            "/folders/content/$PARENT_UUID/files?offset=0&limit=50&sort=plainName&order=ASC",
            recorded.path
        )
        assertEquals("Bearer test-token", recorded.getHeader("Authorization"))
        assertEquals("drive-mobile", recorded.getHeader("internxt-client"))
        assertEquals("v1.9.0", recorded.getHeader("internxt-version"))
        assertEquals("desktop-token-xyz", recorded.getHeader("x-internxt-desktop-header"))
    }

    @Test
    fun unauthorizedResponseSurfacesAsUnauthorizedException() {
        server.enqueue(MockResponse().setResponseCode(401))

        assertThrows(InternxtApiException.UnauthorizedException::class.java) {
            client.listFolderFiles(PARENT_UUID)
        }
    }

    @Test
    fun notFoundResponseSurfacesAsNotFoundException() {
        server.enqueue(MockResponse().setResponseCode(404))

        assertThrows(InternxtApiException.NotFoundException::class.java) {
            client.listFolderFiles("missing-uuid")
        }
    }

    @Test
    fun socketDisconnectSurfacesAsNetworkException() {
        server.enqueue(MockResponse().setSocketPolicy(SocketPolicy.DISCONNECT_AT_START))

        assertThrows(InternxtApiException.NetworkException::class.java) {
            client.listFolderFiles(PARENT_UUID)
        }
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
                    {"index":0,"size":512,"hash":"aa","url":"https://shard/0"}
                  ]
                }
                """.trimIndent()
            )
        )

        val links = client.getDownloadLinks("bucket-id", "file-id-1")

        assertEquals(1, links.shards.size)
        assertEquals("https://shard/0", links.shards[0].url)
        assertEquals(512L, links.shards[0].size)

        val recorded = server.takeRequest()
        val expectedPass = "c775e7b757ede630cd0aa1113bd102661ab38829ca52a6422ab782862f268646"
        val expectedAuth = "Basic " + java.util.Base64.getEncoder()
            .encodeToString("user@example.com:$expectedPass".toByteArray(Charsets.UTF_8))
        assertEquals(expectedAuth, recorded.getHeader("Authorization"))
    }
}
