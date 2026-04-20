package com.internxt.cloud.documents.api

import com.internxt.cloud.documents.api.model.DownloadLinks
import com.internxt.cloud.documents.api.model.DriveFile
import com.internxt.cloud.documents.api.model.DriveFolder
import com.internxt.cloud.documents.api.model.Shard
import com.internxt.cloud.documents.api.model.TrashItem
import com.internxt.cloud.documents.crypto.HashUtil
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
import java.util.concurrent.TimeUnit

class InternxtApiClient(
    private val config: AuthConfig,
    private val client: OkHttpClient = defaultClient()
) {

    fun listFolderFolders(parentUuid: String, offset: Int = 0, limit: Int = DEFAULT_PAGE_SIZE): List<DriveFolder> =
        listChildren(parentUuid, kind = "folders", jsonKey = "folders", offset, limit, ::parseFolder)

    fun listFolderFiles(parentUuid: String, offset: Int = 0, limit: Int = DEFAULT_PAGE_SIZE): List<DriveFile> =
        listChildren(parentUuid, kind = "files", jsonKey = "files", offset, limit, ::parseFile)

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
        val body = execute(driveRequest(url).get().build())
        return body.optJSONArray(jsonKey).orEmpty().map(parse)
    }

    fun createFolder(parentUuid: String, plainName: String): DriveFolder {
        val payload = JSONObject()
            .put("plainName", plainName)
            .put("parentFolderUuid", parentUuid)
        val req = driveRequest(driveUrl("folders"))
            .post(payload.toString().toRequestBody(JSON))
            .build()
        return parseFolder(execute(req))
    }

    fun renameFile(fileUuid: String, newName: String): DriveFile {
        val payload = JSONObject().put("name", newName)
        val req = driveRequest(driveUrl("files/$fileUuid"))
            .patch(payload.toString().toRequestBody(JSON))
            .build()
        return parseFile(execute(req))
    }

    fun renameFolder(folderUuid: String, newName: String): DriveFolder {
        val payload = JSONObject().put("name", newName)
        val req = driveRequest(driveUrl("folders/$folderUuid"))
            .put(payload.toString().toRequestBody(JSON))
            .build()
        return parseFolder(execute(req))
    }

    fun moveFile(fileUuid: String, destinationFolderUuid: String): DriveFile {
        val payload = JSONObject().put("destinationFolder", destinationFolderUuid)
        val req = driveRequest(driveUrl("files/$fileUuid"))
            .patch(payload.toString().toRequestBody(JSON))
            .build()
        return parseFile(execute(req))
    }

    fun moveFolder(folderUuid: String, destinationFolderUuid: String): DriveFolder {
        val payload = JSONObject().put("destinationFolder", destinationFolderUuid)
        val req = driveRequest(driveUrl("folders/$folderUuid"))
            .patch(payload.toString().toRequestBody(JSON))
            .build()
        return parseFolder(execute(req))
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
        execute(req)
    }

    fun getDownloadLinks(bucketId: String, fileId: String): DownloadLinks {
        val url = bridgeUrl("buckets/$bucketId/files/$fileId/mirrors")
        val body = execute(bridgeRequest(url).get().build())
        return parseDownloadLinks(body)
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

    private fun execute(request: Request): JSONObject {
        val response: Response = try {
            client.newCall(request).execute()
        } catch (e: IOException) {
            throw InternxtApiException.NetworkException(e)
        }
        response.use { resp ->
            val bodyStr = resp.body?.string().orEmpty()
            when (resp.code) {
                in 200..299 -> return if (bodyStr.isBlank()) JSONObject() else JSONObject(bodyStr)
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

    private fun parseDownloadLinks(obj: JSONObject): DownloadLinks {
        val shardsJson = obj.optJSONArray("shards") ?: JSONArray()
        val shards = shardsJson.map {
            Shard(
                index = it.optInt("index"),
                size = it.optLongFlexible("size"),
                hash = it.optString("hash"),
                url = it.optString("url")
            )
        }
        return DownloadLinks(
            bucket = obj.optString("bucket"),
            index = obj.optString("index"),
            size = obj.optLongFlexible("size"),
            version = obj.optInt("version", 1),
            shards = shards
        )
    }

    companion object {
        const val DEFAULT_PAGE_SIZE = 50

        private val JSON = "application/json; charset=utf-8".toMediaType()

        private fun defaultClient(): OkHttpClient = OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .build()
    }
}

private fun JSONArray?.orEmpty(): JSONArray = this ?: JSONArray()

private inline fun <T> JSONArray.map(transform: (JSONObject) -> T): List<T> {
    val out = ArrayList<T>(length())
    for (i in 0 until length()) out.add(transform(getJSONObject(i)))
    return out
}

private fun JSONObject.optStringOrNull(key: String): String? =
    if (isNull(key)) null else optString(key).takeIf { it.isNotEmpty() }

private fun JSONObject.optLongFlexible(key: String): Long = when (val v = opt(key)) {
    is Number -> v.toLong()
    is String -> v.toLongOrNull() ?: 0L
    else -> 0L
}
