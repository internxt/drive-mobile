package com.internxt.cloud.documents.crypto

import com.facebook.common.util.Hex
import com.rncrypto.util.CryptoService

/**
 * Derives the AES-CTR key/IV used to decrypt files from Internxt's network shards.
 * Matches src/network/crypto.ts: generateFileKey.
 *
 *   seed      = PBKDF2(mnemonic, "mnemonic", 2048, 64)
 *   bucketKey = SHA-512( seed || bucketId )
 *   fileKey   = SHA-512( bucketKey[0..32] || index )[0..32]
 *   iv        = index[0..16]
 */
object FileKeyDeriver {

    private const val PBKDF2_SALT = "mnemonic"
    private const val PBKDF2_ROUNDS = 2048
    private const val SEED_LENGTH = 64
    private const val FILE_KEY_LENGTH = 32
    private const val IV_LENGTH = 16

    fun deriveFileKey(mnemonic: String, bucketIdHex: String, indexHex: String): ByteArray {
        val crypto = CryptoService.getInstance()
        val seed = crypto.pbkdf2(mnemonic, PBKDF2_SALT.toByteArray(Charsets.UTF_8), PBKDF2_ROUNDS, SEED_LENGTH)
        val bucketKey = crypto.sha512(listOf(seed, Hex.decodeHex(bucketIdHex)))
        val fileKey = crypto.sha512(listOf(bucketKey.copyOf(FILE_KEY_LENGTH), Hex.decodeHex(indexHex)))
        return fileKey.copyOf(FILE_KEY_LENGTH)
    }

    fun deriveIv(indexHex: String): ByteArray = Hex.decodeHex(indexHex).copyOf(IV_LENGTH)

    fun toHex(bytes: ByteArray): String = Hex.encodeHex(bytes, /* truncateAtFirstZero = */ false)
}
