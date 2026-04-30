package com.internxt.cloud.documents.api

import com.internxt.cloud.documents.api.model.TrashItem
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okhttp3.mockwebserver.SocketPolicy
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Before
import org.junit.Test
import org.json.JSONObject

class InternxtApiClientTest {

    private lateinit var server: MockWebServer
    private lateinit var client: InternxtApiClient

    companion object {
        private const val PARENT_UUID = "parent-uuid"
        private const val BUCKET_ID = "bucket-id"
        private const val NEW_FOLDER_NAME = "New Folder"
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
                clientName = "drive-mobile",
                clientVersion = "v1.9.0",
                desktopToken = "desktop-token-xyz"
            )
        )
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    private fun enqueueJson(body: String, code: Int = 200) {
        server.enqueue(MockResponse().setResponseCode(code).setBody(body))
    }

    @Test
    fun listFolderFilesParsesResponseFields() {
        enqueueJson(
            """
            {
              "files": [
                {
                  "uuid": "file-uuid-1",
                  "plainName": "report.pdf",
                  "type": "pdf",
                  "size": 102400,
                  "bucket": "$BUCKET_ID",
                  "folderUuid": "$PARENT_UUID",
                  "createdAt": "2026-01-10T00:00:00.000Z",
                  "fileId": "file-id-1"
                }
              ]
            }
            """.trimIndent()
        )

        val files = client.listFolderFiles(PARENT_UUID)

        assertEquals(1, files.size)
        val file = files[0]
        assertEquals("file-uuid-1", file.uuid)
        assertEquals("report.pdf", file.plainName)
        assertEquals("pdf", file.type)
        assertEquals(102400L, file.size)
        assertEquals(BUCKET_ID, file.bucket)
        assertEquals(PARENT_UUID, file.folderUuid)
        assertEquals("2026-01-10T00:00:00.000Z", file.createdAt)
        assertEquals("file-id-1", file.fileId)
    }

    @Test
    fun listFolderFilesBuildsAuthenticatedDriveRequest() {
        enqueueJson("""{"files":[]}""")

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
    fun unauthorizedResponseSurfacesAsUnauthorized() {
        enqueueJson("", code = 401)

        assertThrows(InternxtApiException.UnauthorizedException::class.java) {
            client.listFolderFiles(PARENT_UUID)
        }
    }

    @Test
    fun notFoundResponseSurfacesAsNotFound() {
        enqueueJson("", code = 404)

        assertThrows(InternxtApiException.NotFoundException::class.java) {
            client.listFolderFiles("missing-uuid")
        }
    }

    @Test
    fun socketDisconnectSurfacesAsNetworkError() {
        server.enqueue(MockResponse().setSocketPolicy(SocketPolicy.DISCONNECT_AT_START))

        assertThrows(InternxtApiException.NetworkException::class.java) {
            client.listFolderFiles(PARENT_UUID)
        }
    }

    @Test
    fun getDownloadLinksUsesBasicAuthWithDerivedBridgePass() {
        enqueueJson(
            """
            {
              "bucket": "$BUCKET_ID",
              "index": "idx",
              "size": 1024,
              "version": 2,
              "shards": [
                {"index":0,"size":512,"hash":"aa","url":"https://shard/0"}
              ]
            }
            """.trimIndent()
        )

        val links = client.getDownloadLinks(BUCKET_ID, "file-id-1")

        assertEquals(1, links.shards.size)
        assertEquals("https://shard/0", links.shards[0].url)
        assertEquals(512L, links.shards[0].size)

        val recorded = server.takeRequest()
        val expectedPass = "c775e7b757ede630cd0aa1113bd102661ab38829ca52a6422ab782862f268646"
        val expectedAuth = "Basic " + java.util.Base64.getEncoder()
            .encodeToString("user@example.com:$expectedPass".toByteArray(Charsets.UTF_8))
        assertEquals(expectedAuth, recorded.getHeader("Authorization"))
    }

    @Test
    fun listFolderFoldersParsesResponseFields() {
        enqueueJson(
            """
            {
              "folders": [
                {
                  "uuid": "folder-uuid-1",
                  "plainName": "Documents",
                  "parentUuid": "$PARENT_UUID",
                  "bucket": "$BUCKET_ID",
                  "createdAt": "2026-01-10T00:00:00.000Z",
                  "updatedAt": "2026-01-11T00:00:00.000Z"
                }
              ]
            }
            """.trimIndent()
        )

        val folders = client.listFolderFolders(PARENT_UUID)

        assertEquals(1, folders.size)
        val folder = folders[0]
        assertEquals("folder-uuid-1", folder.uuid)
        assertEquals("Documents", folder.plainName)
        assertEquals(PARENT_UUID, folder.parentUuid)
        assertEquals(BUCKET_ID, folder.bucket)

        val recorded = server.takeRequest()
        assertEquals(
            "/folders/content/$PARENT_UUID/folders?offset=0&limit=50&sort=plainName&order=ASC",
            recorded.path
        )
    }

    @Test
    fun createFolderPostsPayloadAndReturnsFolder() {
        enqueueJson("""{"uuid":"new-folder-uuid","plainName":"$NEW_FOLDER_NAME","parentUuid":"$PARENT_UUID"}""")

        val created = client.createFolder(PARENT_UUID, NEW_FOLDER_NAME)

        assertEquals("new-folder-uuid", created.uuid)
        assertEquals(NEW_FOLDER_NAME, created.plainName)
        assertEquals(PARENT_UUID, created.parentUuid)

        val recorded = server.takeRequest()
        assertEquals("POST", recorded.method)
        assertEquals("/folders", recorded.path)
        val sentBody = JSONObject(recorded.body.readUtf8())
        assertEquals(NEW_FOLDER_NAME, sentBody.getString("plainName"))
        assertEquals(PARENT_UUID, sentBody.getString("parentFolderUuid"))
    }

    @Test
    fun listFolderFilesMapsNullOptionalFieldsToNull() {
        enqueueJson(
            """
            {
              "files": [
                {
                  "uuid": "file-uuid-1",
                  "plainName": "report.pdf",
                  "type": null,
                  "bucket": null,
                  "folderUuid": null,
                  "createdAt": null,
                  "updatedAt": null,
                  "fileId": null
                }
              ]
            }
            """.trimIndent()
        )

        val file = client.listFolderFiles(PARENT_UUID).single()

        assertNull(file.type)
        assertNull(file.bucket)
        assertNull(file.folderUuid)
        assertNull(file.createdAt)
        assertNull(file.updatedAt)
        assertNull(file.fileId)
    }

    @Test
    fun listFolderFilesParsesSizeGivenAsString() {
        enqueueJson(
            """
            {
              "files": [
                {
                  "uuid": "file-uuid-1",
                  "plainName": "big.bin",
                  "size": "9999999999"
                }
              ]
            }
            """.trimIndent()
        )

        val file = client.listFolderFiles(PARENT_UUID).single()

        assertEquals(9999999999L, file.size)
    }

    @Test
    fun getFolderHitsMetaEndpointAndReturnsParsedFolder() {
        enqueueJson("""{"uuid":"folder-uuid-1","plainName":"Documents"}""")

        val folder = client.getFolder("folder-uuid-1")

        assertEquals("folder-uuid-1", folder?.uuid)
        assertEquals("Documents", folder?.plainName)

        val recorded = server.takeRequest()
        assertEquals("GET", recorded.method)
        assertEquals("/folders/folder-uuid-1/meta", recorded.path)
    }

    @Test
    fun getFolderReturnsNullWhenNotFound() {
        enqueueJson("", code = 404)

        assertNull(client.getFolder("missing-uuid"))
    }

    @Test
    fun getFileHitsMetaEndpointAndReturnsParsedFile() {
        enqueueJson("""{"uuid":"file-uuid-1","plainName":"report.pdf","type":"pdf","size":102400}""")

        val file = client.getFile("file-uuid-1")

        assertEquals("file-uuid-1", file?.uuid)
        assertEquals("report.pdf", file?.plainName)
        assertEquals(102400L, file?.size)

        val recorded = server.takeRequest()
        assertEquals("GET", recorded.method)
        assertEquals("/files/file-uuid-1/meta", recorded.path)
    }

    @Test
    fun getFileReturnsNullWhenNotFound() {
        enqueueJson("", code = 404)

        assertNull(client.getFile("missing-uuid"))
    }

    @Test
    fun renameFilePutsPlainNameToMetaEndpoint() {
        enqueueJson("")

        client.renameFile("file-uuid-1", "renamed.pdf")

        val recorded = server.takeRequest()
        assertEquals("PUT", recorded.method)
        assertEquals("/files/file-uuid-1/meta", recorded.path)
        assertEquals("renamed.pdf", JSONObject(recorded.body.readUtf8()).getString("plainName"))
    }

    @Test
    fun renameFolderPutsPlainNameToMetaEndpoint() {
        enqueueJson("")

        client.renameFolder("folder-uuid-1", "Renamed")

        val recorded = server.takeRequest()
        assertEquals("PUT", recorded.method)
        assertEquals("/folders/folder-uuid-1/meta", recorded.path)
        assertEquals("Renamed", JSONObject(recorded.body.readUtf8()).getString("plainName"))
    }

    @Test
    fun moveFilePatchesDestinationPayload() {
        enqueueJson("""{"uuid":"file-uuid-1","folderUuid":"$PARENT_UUID"}""")

        client.moveFile("file-uuid-1", PARENT_UUID)

        val recorded = server.takeRequest()
        assertEquals("PATCH", recorded.method)
        assertEquals("/files/file-uuid-1", recorded.path)
        assertEquals(PARENT_UUID, JSONObject(recorded.body.readUtf8()).getString("destinationFolder"))
    }

    @Test
    fun moveFolderPatchesDestinationPayload() {
        enqueueJson("""{"uuid":"folder-uuid-1","parentUuid":"$PARENT_UUID"}""")

        client.moveFolder("folder-uuid-1", PARENT_UUID)

        val recorded = server.takeRequest()
        assertEquals("PATCH", recorded.method)
        assertEquals("/folders/folder-uuid-1", recorded.path)
        assertEquals(PARENT_UUID, JSONObject(recorded.body.readUtf8()).getString("destinationFolder"))
    }

    @Test
    fun sendToTrashPostsItemsPayload() {
        enqueueJson("")

        client.sendToTrash(
            listOf(
                TrashItem("file-uuid-1", TrashItem.Type.FILE),
                TrashItem("folder-uuid-1", TrashItem.Type.FOLDER),
            )
        )

        val recorded = server.takeRequest()
        assertEquals("POST", recorded.method)
        assertEquals("/storage/trash/add", recorded.path)
        val items = JSONObject(recorded.body.readUtf8()).getJSONArray("items")
        assertEquals(2, items.length())
        assertEquals("file-uuid-1", items.getJSONObject(0).getString("uuid"))
        assertEquals("file", items.getJSONObject(0).getString("type"))
        assertEquals("folder-uuid-1", items.getJSONObject(1).getString("uuid"))
        assertEquals("folder", items.getJSONObject(1).getString("type"))
    }

    @Test
    fun serverErrorSurfacesAsApiError() {
        enqueueJson("""{"error":"boom"}""", code = 500)

        val thrown = assertThrows(InternxtApiException.ApiError::class.java) {
            client.listFolderFiles(PARENT_UUID)
        }
        assertEquals(500, thrown.code)
        assertEquals("""{"error":"boom"}""", thrown.body)
    }
}
