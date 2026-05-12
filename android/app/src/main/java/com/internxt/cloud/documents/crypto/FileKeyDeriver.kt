package com.internxt.cloud.documents.crypto

import com.rncrypto.util.CryptoService
import java.security.MessageDigest

object FileKeyDeriver {

    private const val PBKDF2_SALT = "mnemonic"
    private const val PBKDF2_ROUNDS = 2048
    private const val SEED_LENGTH = 64
    private const val FILE_KEY_LENGTH = 32
    private const val IV_LENGTH = 16

    fun deriveFileKey(mnemonic: String, bucketIdHex: String, indexHex: String): ByteArray {
        val seed = pbkdf2Seed(mnemonic)
        val bucketKey = sha512(seed, hexDecode(bucketIdHex))
        val fileKey = sha512(bucketKey.copyOf(FILE_KEY_LENGTH), hexDecode(indexHex))
        return fileKey.copyOf(FILE_KEY_LENGTH)
    }

    fun deriveIv(indexHex: String): ByteArray = hexDecode(indexHex).copyOf(IV_LENGTH)

    fun toHex(bytes: ByteArray): String {
        val sb = StringBuilder(bytes.size * 2)
        for (b in bytes) {
            val v = b.toInt() and 0xff
            sb.append(HEX[v ushr 4])
            sb.append(HEX[v and 0x0f])
        }
        return sb.toString()
    }

    private fun pbkdf2Seed(mnemonic: String): ByteArray =
        CryptoService.getInstance().pbkdf2(mnemonic, PBKDF2_SALT.toByteArray(Charsets.UTF_8), PBKDF2_ROUNDS, SEED_LENGTH)

    private fun sha512(key: ByteArray, data: ByteArray): ByteArray {
        val md = MessageDigest.getInstance("SHA-512")
        md.update(key)
        md.update(data)
        return md.digest()
    }

    private fun hexDecode(hex: String): ByteArray {
        require(hex.length % 2 == 0) { "Hex string must have even length" }
        val out = ByteArray(hex.length / 2)
        var i = 0
        while (i < hex.length) {
            val hi = Character.digit(hex[i], 16)
            val lo = Character.digit(hex[i + 1], 16)
            require(hi >= 0 && lo >= 0) { "Invalid hex character at position $i" }
            out[i / 2] = ((hi shl 4) or lo).toByte()
            i += 2
        }
        return out
    }

    private val HEX = "0123456789abcdef".toCharArray()
}
