package com.internxt.cloud.documents.download

import com.internxt.cloud.documents.api.model.Shard
import com.internxt.cloud.documents.http.await
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import kotlinx.coroutines.ensureActive
import kotlin.coroutines.coroutineContext

object EncryptedFileDownloader {

    private const val COPY_BUFFER_SIZE = 16 * 1024

    suspend fun download(
        client: OkHttpClient,
        shards: List<Shard>,
        target: File,
    ) {
        require(shards.isNotEmpty()) { "No shards to download" }
        prepareTarget(target)

        FileOutputStream(target, /* append = */ true).use { out ->
            shards.sortedBy { it.index }.forEach { shard ->
                coroutineContext.ensureActive()
                downloadShard(client, shard, out)
            }
            out.flush()
        }
    }

    private fun prepareTarget(target: File) {
        target.parentFile?.mkdirs()
        if (target.exists() && !target.delete()) {
            throw IOException("Failed to delete existing target file: ${target.absolutePath}")
        }
    }

    private suspend fun downloadShard(
        client: OkHttpClient,
        shard: Shard,
        out: FileOutputStream,
    ) {
        val request = Request.Builder().url(shard.url).get().build()
        client.newCall(request).await().use { response -> writeShardResponse(shard, response, out) }
    }

    private fun writeShardResponse(shard: Shard, response: okhttp3.Response, out: FileOutputStream) {
        if (!response.isSuccessful) {
            throw IOException("Shard ${shard.index} HTTP ${response.code}")
        }
        val body = response.body ?: throw IOException("Shard ${shard.index} empty body")
        val buffer = ByteArray(COPY_BUFFER_SIZE)
        body.byteStream().use { input ->
            var read = input.read(buffer)
            while (read != -1) {
                out.write(buffer, 0, read)
                read = input.read(buffer)
            }
        }
    }
}
