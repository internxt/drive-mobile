package com.internxt.cloud.documents.api

import com.internxt.cloud.documents.api.model.CreateFileEntry
import com.internxt.cloud.documents.api.model.DownloadLinks
import com.internxt.cloud.documents.api.model.DriveFile
import com.internxt.cloud.documents.api.model.DriveFolder
import com.internxt.cloud.documents.api.model.FinishUploadShard
import com.internxt.cloud.documents.api.model.Shard
import com.internxt.cloud.documents.api.model.TrashItem
import com.internxt.cloud.documents.api.model.UploadFinishResponse
import com.internxt.cloud.documents.api.model.UploadSlot
import com.internxt.cloud.documents.api.model.UploadStartResponse
import com.internxt.cloud.documents.crypto.HashUtil
import com.internxt.cloud.documents.http.HttpClients
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.util.Base64

class InternxtApiClient(
    private val config: AuthConfig,
    private val client: OkHttpClient = HttpClients.api
) {

    fun listFolderFolders(parentUuid: String, offset: Int = 0, limit: Int = DEFAULT_PAGE_SIZE): List<DriveFolder> =
        listChildren(parentUuid, kind = "folders", jsonKey = "folders", offset, limit, ::parseFolder)

    fun listFolderFiles(parentUuid: String, offset: Int = 0, limit: Int = DEFAULT_PAGE_SIZE): List<DriveFile> =
        listChildren(parentUuid, kind = "files", jsonKey = "files", offset, limit, ::parseFile)

    fun getFolder(uuid: String): DriveFolder? = getMeta("folders/$uuid/meta", ::parseFolder)

    fun getFile(uuid: String): DriveFile? = getMeta("files/$uuid/meta", ::parseFile)

    private fun <T> getMeta(path: String, parse: (JSONObject) -> T): T? = try {
        parse(executeApiRequest(driveRequest(driveUrl(path)).get().build()))
    } catch (_: InternxtApiException.NotFoundException) {
        null
    }

    private fun <T> listChildren(
        parentUuid: String,
        kind: String,
        jsonKey: String,
        offset: Int,
        limit: Int,
        parse: (JSONObject) -> T
    ): List<T> {
        val url = driveUrl("folders/content/$parentUuid/$kind")
            .newBuilder()
            .addQueryParameter("offset", offset.toString())
            .addQueryParameter("limit", limit.toString())
            .addQueryParameter("sort", "plainName")
            .addQueryParameter("order", "ASC")
            .build()
        val body = executeApiRequest(driveRequest(url).get().build())
        return body.optJSONArray(jsonKey).orEmpty().map(parse)
    }

    fun createFolder(parentUuid: String, plainName: String): DriveFolder {
        val payload = JSONObject()
            .put("plainName", plainName)
            .put("parentFolderUuid", parentUuid)
        val req = driveRequest(driveUrl("folders"))
            .post(payload.toString().toRequestBody(JSON))
            .build()
        return parseFolder(executeApiRequest(req))
    }

    fun renameFile(fileUuid: String, newName: String) {
        val payload = JSONObject().put("plainName", newName)
        val req = driveRequest(driveUrl("files/$fileUuid/meta"))
            .put(payload.toString().toRequestBody(JSON))
            .build()
        executeApiRequest(req)
    }

    fun renameFolder(folderUuid: String, newName: String) {
        val payload = JSONObject().put("plainName", newName)
        val req = driveRequest(driveUrl("folders/$folderUuid/meta"))
            .put(payload.toString().toRequestBody(JSON))
            .build()
        executeApiRequest(req)
    }

    fun moveFile(fileUuid: String, destinationFolderUuid: String): DriveFile {
        val payload = JSONObject().put("destinationFolder", destinationFolderUuid)
        val req = driveRequest(driveUrl("files/$fileUuid"))
            .patch(payload.toString().toRequestBody(JSON))
            .build()
        return parseFile(executeApiRequest(req))
    }

    fun moveFolder(folderUuid: String, destinationFolderUuid: String): DriveFolder {
        val payload = JSONObject().put("destinationFolder", destinationFolderUuid)
        val req = driveRequest(driveUrl("folders/$folderUuid"))
            .patch(payload.toString().toRequestBody(JSON))
            .build()
        return parseFolder(executeApiRequest(req))
    }

    fun sendToTrash(items: List<TrashItem>) {
        val jsonItems = JSONArray()
        for (item in items) {
            jsonItems.put(JSONObject().put("uuid", item.uuid).put("type", item.type.wire))
        }
        val payload = JSONObject().put("items", jsonItems)
        val req = driveRequest(driveUrl("storage/trash/add"))
            .post(payload.toString().toRequestBody(JSON))
            .build()
        executeApiRequest(req)
    }

    fun startUpload(bucketId: String, encryptedSize: Long, parts: Int = 1): UploadStartResponse {
        require(parts >= 1) { "parts must be >= 1" }
        val payload = JSONObject().put(
            "uploads",
            JSONArray().put(
                JSONObject()
                    .put("index", 0)
                    .put("size", encryptedSize)
            )
        )
        val url = bridgeUrl("v2/buckets/$bucketId/files/start")
            .newBuilder()
            .addQueryParameter("multiparts", parts.toString())
            .build()
        val req = bridgeRequest(url)
            .post(payload.toString().toRequestBody(JSON))
            .build()
        return parseUploadStart(executeApiRequest(req))
    }

    fun finishUpload(
        bucketId: String,
        indexHex: String,
        shards: List<FinishUploadShard>,
    ): UploadFinishResponse {
        require(shards.isNotEmpty()) { "shards cannot be empty" }
        val shardsJson = JSONArray()
        for (shard in shards) {
            val obj = JSONObject()
                .put("uuid", shard.uuid)
                .put("hash", shard.hash)
            if (shard.uploadId != null) obj.put("UploadId", shard.uploadId)
            if (shard.parts != null) {
                val parts = JSONArray()
                shard.parts.sortedBy { it.partNumber }.forEach { part ->
                    parts.put(
                        JSONObject()
                            .put("PartNumber", part.partNumber)
                            .put("ETag", part.etag)
                    )
                }
                obj.put("parts", parts)
            }
            shardsJson.put(obj)
        }
        val payload = JSONObject()
            .put("index", indexHex)
            .put("shards", shardsJson)
        val req = bridgeRequest(bridgeUrl("v2/buckets/$bucketId/files/finish"))
            .post(payload.toString().toRequestBody(JSON))
            .build()
        val body = executeApiRequest(req)
        val id = body.optStringOrNull("id")
            ?: throw InternxtApiException.MalformedResponse("Bridge /finish missing 'id'")
        return UploadFinishResponse(id = id, bucket = body.optStringOrNull("bucket"))
    }

    fun createFileEntry(entry: CreateFileEntry): DriveFile {
        val payload = JSONObject()
            .put("fileId", entry.fileId)
            .put("type", entry.type)
            .put("size", entry.size)
            .put("plainName", entry.plainName)
            .put("bucket", entry.bucket)
            .put("folderUuid", entry.folderUuid)
            .put("encryptVersion", entry.encryptVersion)
        entry.modificationTime?.let { payload.put("modificationTime", it) }
        entry.creationTime?.let { payload.put("creationTime", it) }
        val req = driveRequest(driveUrl("files"))
            .post(payload.toString().toRequestBody(JSON))
            .build()
        return parseFile(executeApiRequest(req))
    }

    private fun parseUploadStart(body: JSONObject): UploadStartResponse {
        val uploadsJson = body.optJSONArray("uploads")
            ?: throw InternxtApiException.MalformedResponse("Bridge /start missing 'uploads'")
        return UploadStartResponse(uploads = uploadsJson.map(::parseUploadSlot))
    }

    private fun parseUploadSlot(obj: JSONObject): UploadSlot {
        val index = obj.optInt("index")
        val uuid = obj.requireString("uuid")
        return when (val urlsArr = obj.optJSONArray("urls")) {
            null -> UploadSlot.Single(
                index = index,
                uuid = uuid,
                url = obj.requireString("url"),
            )
            else -> UploadSlot.Multipart(
                index = index,
                uuid = uuid,
                urls = urlsArr.toStringList(),
                uploadId = obj.requireString("UploadId"),
            )
        }
    }

    fun getDownloadLinks(bucketId: String, fileId: String): DownloadLinks {
        val url = bridgeUrl("buckets/$bucketId/files/$fileId/info")
        val request = bridgeRequest(url).header("x-api-version", "2").get().build()
        return parseDownloadLinks(executeApiRequest(request), bucketId, fileId)
    }

    private fun parseDownloadLinks(body: JSONObject, bucketId: String, fileId: String): DownloadLinks {
        val index = body.optStringOrNull("index")
            ?: throw InternxtApiException.MalformedResponse("Bridge /info missing 'index'")
        val version = body.optInt("version", 1)
        if (version != 2) {
            throw InternxtApiException.MalformedResponse("File version=$version is not supported (V2 only)")
        }
        val shardsJson = body.optJSONArray("shards") ?: JSONArray()
        if (shardsJson.length() == 0) {
            throw InternxtApiException.MalformedResponse("No shards returned for file $fileId")
        }
        val shards = shardsJson.map { obj ->
            Shard(
                index = obj.optInt("index"),
                size = obj.optLongFlexible("size"),
                hash = obj.optString("hash"),
                url = obj.optString("url"),
            )
        }
        return DownloadLinks(
            bucket = bucketId,
            index = index,
            size = body.optLongFlexible("size"),
            version = version,
            shards = shards,
        )
    }

    private fun driveRequest(url: okhttp3.HttpUrl): Request.Builder =
        baseRequest(url).header("Authorization", "Bearer ${config.bearerToken}")

    private fun bridgeRequest(url: okhttp3.HttpUrl): Request.Builder {
        val pass = HashUtil.deriveBridgePass(config.userId)
        val basic = Base64.getEncoder().encodeToString("${config.bridgeUser}:$pass".toByteArray(Charsets.UTF_8))
        return baseRequest(url).header("Authorization", "Basic $basic")
    }

    private fun baseRequest(url: okhttp3.HttpUrl): Request.Builder {
        val builder = Request.Builder()
            .url(url)
            .header("internxt-client", config.clientName)
            .header("internxt-version", config.clientVersion)
        config.desktopToken?.let { builder.header("x-internxt-desktop-header", it) }
        return builder
    }

    private fun driveUrl(path: String) = "${config.driveBaseUrl.trimEnd('/')}/$path".toHttpUrl()
    private fun bridgeUrl(path: String) = "${config.bridgeBaseUrl.trimEnd('/')}/$path".toHttpUrl()

    private fun executeApiRequest(request: Request): JSONObject {
        val response: Response = try {
            client.newCall(request).execute()
        } catch (e: IOException) {
            throw InternxtApiException.NetworkException(e)
        }
        response.use { resp ->
            val bodyStr = resp.body?.string().orEmpty()
            return when (resp.code) {
                in 200..299 -> if (bodyStr.isBlank()) JSONObject() else JSONObject(bodyStr)
                401 -> throw InternxtApiException.UnauthorizedException()
                404 -> throw InternxtApiException.NotFoundException()
                else -> throw InternxtApiException.ApiError(resp.code, bodyStr)
            }
        }
    }

    private fun parseFolder(obj: JSONObject): DriveFolder = DriveFolder(
        uuid = obj.getString("uuid"),
        plainName = obj.optString("plainName"),
        parentUuid = obj.optStringOrNull("parentUuid"),
        bucket = obj.optStringOrNull("bucket"),
        createdAt = obj.optStringOrNull("createdAt"),
        updatedAt = obj.optStringOrNull("updatedAt")
    )

    private fun parseFile(obj: JSONObject): DriveFile = DriveFile(
        uuid = obj.getString("uuid"),
        plainName = obj.optString("plainName"),
        type = obj.optStringOrNull("type"),
        size = obj.optLongFlexible("size"),
        bucket = obj.optStringOrNull("bucket"),
        folderUuid = obj.optStringOrNull("folderUuid"),
        createdAt = obj.optStringOrNull("createdAt"),
        updatedAt = obj.optStringOrNull("updatedAt"),
        fileId = obj.optStringOrNull("fileId")
    )

    companion object {
        const val DEFAULT_PAGE_SIZE = 50

        private val JSON = "application/json; charset=utf-8".toMediaType()
    }
}
