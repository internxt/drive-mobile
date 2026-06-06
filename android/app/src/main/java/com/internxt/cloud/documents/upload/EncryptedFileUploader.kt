package com.internxt.cloud.documents.upload

import com.internxt.cloud.documents.api.model.UploadedPart
import com.internxt.cloud.documents.crypto.Ripemd160
import com.internxt.cloud.documents.crypto.awaitCryptoService
import com.internxt.cloud.documents.crypto.toHex
import com.internxt.cloud.documents.http.await
import com.rncrypto.util.CryptoService
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody
import okio.BufferedSink
import okio.source
import java.io.File
import java.io.IOException
import java.io.InputStream
import java.io.RandomAccessFile
import java.security.MessageDigest
import kotlinx.coroutines.ensureActive
import kotlin.coroutines.coroutineContext

object EncryptedFileUploader {

    internal const val COPY_BUFFER_SIZE = 16 * 1024
    private val OCTET_STREAM = "application/octet-stream".toMediaType()

    data class Encrypted(
        val size: Long,
        val wholeSha256Hex: String,
    )

    /**
     * Encrypt [plain] → [tempEnc] using the official `@internxt/rn-crypto` CryptoService —
     * the same code path the RN side calls into (NetworkFacade.ts -> encryptFile). The
     * package does not return a digest, so SHA-256 over the ciphertext is computed here
     * by streaming the produced file back through MessageDigest.
     */
    suspend fun encryptFile(plain: File, tempEnc: File, key: ByteArray, iv: ByteArray): Encrypted {
        prepareTarget(tempEnc)
        awaitCryptoService("Encryption failed") { cb ->
            CryptoService.getInstance().encryptFile(
                plain.absolutePath,
                tempEnc.absolutePath,
                key.toHex(),
                iv.toHex(),
                /* runInBackground = */ false,
                cb,
            )
        }
        return Encrypted(size = tempEnc.length(), wholeSha256Hex = computeSha256Hex(tempEnc))
    }

    private fun computeSha256Hex(file: File): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val buffer = ByteArray(COPY_BUFFER_SIZE)
        file.inputStream().use { input ->
            while (true) {
                val n = input.read(buffer)
                if (n == -1) break
                digest.update(buffer, 0, n)
            }
        }
        return digest.digest().toHex()
    }

    fun computePartSha256(tempEnc: File, partSize: Long): List<String> {
        require(partSize > 0) { "partSize must be > 0" }
        val total = tempEnc.length()
        if (total == 0L) return emptyList()
        val hashes = mutableListOf<String>()
        val buffer = ByteArray(COPY_BUFFER_SIZE)
        RandomAccessFile(tempEnc, "r").use { raf ->
            var consumed = 0L
            while (consumed < total) {
                val partEnd = (consumed + partSize).coerceAtMost(total)
                val digest = MessageDigest.getInstance("SHA-256")
                var partRemaining = partEnd - consumed
                while (partRemaining > 0) {
                    val toRead = partRemaining.coerceAtMost(buffer.size.toLong()).toInt()
                    val n = raf.read(buffer, 0, toRead)
                    if (n == -1) throw IOException("Unexpected EOF computing part hashes")
                    digest.update(buffer, 0, n)
                    partRemaining -= n
                    consumed += n
                }
                hashes.add(digest.digest().toHex())
            }
        }
        return hashes
    }

    suspend fun uploadSingle(
        client: OkHttpClient,
        tempEnc: File,
        url: String,
        onProgress: ((Long) -> Unit)? = null,
    ) {
        val body = fileRangeBody(tempEnc, 0L, tempEnc.length(), onProgress, baseSent = 0L)
        val request = Request.Builder().url(url).put(body).build()
        runCall(client, request) { /* ETag not needed for single */ }
    }

    suspend fun uploadMultipart(
        client: OkHttpClient,
        tempEnc: File,
        urls: List<String>,
        partSize: Long,
        onProgress: ((Long) -> Unit)? = null,
    ): List<UploadedPart> {
        require(urls.isNotEmpty()) { "urls cannot be empty" }
        val total = tempEnc.length()

        val parts = ArrayList<UploadedPart>(urls.size)
        var offset = 0L
        urls.forEachIndexed { index, url ->
            coroutineContext.ensureActive()
            val length = (total - offset).coerceAtMost(partSize)
            require(length > 0) { "Computed empty part for index $index" }
            val body = fileRangeBody(tempEnc, offset, length, onProgress, baseSent = offset)
            val request = Request.Builder().url(url).put(body).build()
            val etag = runCall(client, request) { response ->
                response.header("ETag") ?: response.header("Etag")
                    ?: throw IOException("Part ${index + 1} missing ETag in response")
            }
            parts.add(UploadedPart(partNumber = index + 1, etag = etag))
            offset += length
        }
        return parts
    }

    /**
     * `ripemd160(hex_decode(concat(sha256_hex_per_part)))`. For single-part upload,
     * pass a 1-element list with the whole-file SHA-256.
     */
    fun computeShardHash(partHashesHex: List<String>): String {
        require(partHashesHex.isNotEmpty()) { "no part hashes" }
        val concatenated = partHashesHex.joinToString(separator = "")
        return Ripemd160.digest(hexDecode(concatenated)).toHex()
    }

    private suspend fun <T> runCall(
        client: OkHttpClient,
        request: Request,
        onResponse: (okhttp3.Response) -> T,
    ): T = client.newCall(request).await().use { response ->
        if (!response.isSuccessful) {
            throw IOException("PUT failed HTTP ${response.code}")
        }
        onResponse(response)
    }

    private fun fileRangeBody(
        file: File,
        offset: Long,
        length: Long,
        onProgress: ((Long) -> Unit)? = null,
        baseSent: Long = 0L,
    ): RequestBody =
        object : RequestBody() {
            override fun contentType() = OCTET_STREAM
            override fun contentLength(): Long = length
            override fun writeTo(sink: BufferedSink) {
                RandomAccessFile(file, "r").use { raf ->
                    raf.seek(offset)
                    if (onProgress == null) {
                        val limited = LimitedInputStream(raf, length)
                        limited.source().use { sink.writeAll(it) }
                    } else {
                        val buffer = ByteArray(COPY_BUFFER_SIZE)
                        var remaining = length
                        var sent = 0L
                        while (remaining > 0) {
                            val toRead = remaining.coerceAtMost(buffer.size.toLong()).toInt()
                            val n = raf.read(buffer, 0, toRead)
                            if (n == -1) throw IOException("Unexpected EOF reading upload body")
                            sink.write(buffer, 0, n)
                            remaining -= n
                            sent += n
                            onProgress(baseSent + sent)
                        }
                    }
                }
            }
        }

    private fun prepareTarget(target: File) {
        target.parentFile?.mkdirs()
        if (target.exists() && !target.delete()) {
            throw IOException("Failed to delete existing temp file: ${target.absolutePath}")
        }
    }

    private fun hexDecode(hex: String): ByteArray {
        require(hex.length % 2 == 0) { "Invalid hex length" }
        val out = ByteArray(hex.length / 2)
        for (i in out.indices) {
            val hi = Character.digit(hex[i * 2], 16)
            val lo = Character.digit(hex[i * 2 + 1], 16)
            require(hi >= 0 && lo >= 0) { "Invalid hex char" }
            out[i] = ((hi shl 4) or lo).toByte()
        }
        return out
    }

    private class LimitedInputStream(
        private val raf: RandomAccessFile,
        private var remaining: Long,
    ) : InputStream() {

        override fun read(): Int {
            if (remaining <= 0) return -1
            val b = raf.read()
            if (b == -1) {
                remaining = 0
                return -1
            }
            remaining--
            return b
        }

        override fun read(b: ByteArray, off: Int, len: Int): Int {
            if (remaining <= 0) return -1
            val toRead = remaining.coerceAtMost(len.toLong()).toInt()
            val n = raf.read(b, off, toRead)
            if (n == -1) {
                remaining = 0
                return -1
            }
            remaining -= n
            return n
        }
    }
}
