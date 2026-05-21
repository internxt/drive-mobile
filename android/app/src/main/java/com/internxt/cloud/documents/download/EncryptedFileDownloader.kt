package com.internxt.cloud.documents.download

import android.os.CancellationSignal
import android.os.OperationCanceledException
import com.internxt.cloud.documents.api.model.Shard
import okhttp3.Call
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.util.concurrent.atomic.AtomicReference

object EncryptedFileDownloader {

    private const val COPY_BUFFER_SIZE = 16 * 1024

    @Throws(IOException::class, OperationCanceledException::class)
    fun download(
        client: OkHttpClient,
        shards: List<Shard>,
        target: File,
        signal: CancellationSignal?
    ) {
        require(shards.isNotEmpty()) { "No shards to download" }
        prepareTarget(target)

        val activeCall = AtomicReference<Call?>(null)
        signal?.setOnCancelListener { activeCall.get()?.cancel() }

        FileOutputStream(target, /* append = */ true).use { out ->
            shards.sortedBy { it.index }.forEach { shard ->
                signal?.throwIfCanceled()
                downloadShard(client, shard, out, activeCall, signal)
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

    private fun downloadShard(
        client: OkHttpClient,
        shard: Shard,
        out: FileOutputStream,
        activeCall: AtomicReference<Call?>,
        signal: CancellationSignal?
    ) {
        val request = Request.Builder().url(shard.url).get().build()
        val call = client.newCall(request)
        activeCall.set(call)

        try {
            call.execute().use { response -> writeShardResponse(shard, response, out) }
        } catch (e: IOException) {
            if (signal?.isCanceled == true) {
                throw OperationCanceledException("Download cancelled").apply { initCause(e) }
            }
            throw e
        } finally {
            activeCall.set(null)
        }
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
