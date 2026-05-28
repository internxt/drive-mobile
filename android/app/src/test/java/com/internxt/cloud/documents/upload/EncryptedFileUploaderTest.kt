package com.internxt.cloud.documents.upload

import com.internxt.cloud.documents.crypto.Ripemd160
import com.internxt.cloud.documents.crypto.toHex
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okhttp3.mockwebserver.RecordedRequest
import org.junit.After
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import java.io.File
import java.nio.file.Files
import java.security.MessageDigest
import javax.crypto.Cipher
import javax.crypto.spec.IvParameterSpec
import javax.crypto.spec.SecretKeySpec

/**
 * Encryption itself is exercised by the `@internxt/rn-crypto` package's own test suite
 * (`EncryptFileRepositoryTest`) — we don't re-verify the cipher here. These tests cover
 * the upload + hashing logic, building the encrypted input with a control AES-CTR call
 * so we know exactly what bytes the uploader is meant to PUT.
 */
class EncryptedFileUploaderTest {

    companion object {
        private const val SHA_256 = "SHA-256"
    }

    private lateinit var server: MockWebServer
    private lateinit var client: OkHttpClient
    private lateinit var tempDir: File

    private val key = ByteArray(32) { it.toByte() }
    private val iv = ByteArray(16) { (it + 1).toByte() }

    @Before
    fun setUp() {
        server = MockWebServer().apply { start() }
        client = OkHttpClient()
        tempDir = Files.createTempDirectory("uploader-test").toFile()
    }

    @After
    fun tearDown() {
        server.shutdown()
        tempDir.deleteRecursively()
    }

    private fun controlEncrypt(plain: ByteArray): ByteArray {
        val cipher = Cipher.getInstance("AES/CTR/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, SecretKeySpec(key, "AES"), IvParameterSpec(iv))
        return cipher.doFinal(plain)
    }

    private fun writeEncrypted(name: String, plain: ByteArray): File =
        File(tempDir, name).apply { writeBytes(controlEncrypt(plain)) }

    @Test
    fun uploadSinglePutsTempFileContentsAndReportsCorrectHash() {
        val plain = ByteArray(8_000) { it.toByte() }
        val tempEnc = writeEncrypted("single.enc", plain)
        val encBytes = tempEnc.readBytes()
        val sha = MessageDigest.getInstance(SHA_256).digest(encBytes)

        server.enqueue(MockResponse().setResponseCode(200))
        val url = server.url("/upload").toString()
        EncryptedFileUploader.uploadSingle(client, tempEnc, url, signal = null)

        val recorded = server.takeRequest()
        assertEquals("PUT", recorded.method)
        assertEquals("/upload", recorded.path)
        assertArrayEquals(encBytes, recorded.body.readByteArray())

        val computed = EncryptedFileUploader.computeShardHash(listOf(sha.toHex()))
        val expected = Ripemd160.digest(sha).toHex()
        assertEquals(expected, computed)
    }

    @Test
    fun uploadMultipartCollectsEtagsAndPartHashesMatchSlices() {
        val partSize = 4_000L
        val plain = ByteArray(13_000) { it.toByte() }
        val tempEnc = writeEncrypted("multi.enc", plain)
        val totalSize = tempEnc.length()

        val urls = (1..4).map { idx ->
            server.enqueue(MockResponse().setResponseCode(200).setHeader("ETag", "etag-$idx"))
            server.url("/part-$idx").toString()
        }

        val parts = EncryptedFileUploader.uploadMultipart(
            client = client,
            tempEnc = tempEnc,
            urls = urls,
            partSize = partSize,
            signal = null,
        )

        assertEquals(listOf(1, 2, 3, 4), parts.map { it.partNumber })
        assertEquals(listOf("etag-1", "etag-2", "etag-3", "etag-4"), parts.map { it.etag })

        val sentParts = (1..4).map { server.takeRequest() }
        var offset = 0
        sentParts.forEachIndexed { i, req: RecordedRequest ->
            val expectedLength = ((offset + partSize).coerceAtMost(totalSize) - offset).toInt()
            val body = req.body.readByteArray()
            assertEquals("part ${i + 1} length", expectedLength, body.size)
            assertArrayEquals(
                "part ${i + 1} bytes",
                tempEnc.readBytes().copyOfRange(offset, offset + expectedLength),
                body,
            )
            offset += expectedLength
        }

        // hash parity with the RN multipart formula
        val partHashes = EncryptedFileUploader.computePartSha256(tempEnc, partSize)
        val bytes = tempEnc.readBytes()
        val expected = partHashes.mapIndexed { i, h ->
            val start = (i * partSize).toInt()
            val end = (start + partSize.toInt()).coerceAtMost(bytes.size)
            assertEquals(MessageDigest.getInstance(SHA_256).digest(bytes.copyOfRange(start, end)).toHex(), h)
            h
        }
        val computed = EncryptedFileUploader.computeShardHash(expected)
        val expectedHash = Ripemd160.digest(hexDecode(expected.joinToString(""))).toHex()
        assertEquals(expectedHash, computed)
    }

    private fun hexDecode(hex: String): ByteArray {
        val out = ByteArray(hex.length / 2)
        for (i in out.indices) {
            val hi = Character.digit(hex[i * 2], 16)
            val lo = Character.digit(hex[i * 2 + 1], 16)
            out[i] = ((hi shl 4) or lo).toByte()
        }
        return out
    }
}
