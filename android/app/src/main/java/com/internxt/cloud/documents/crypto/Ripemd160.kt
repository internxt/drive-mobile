package com.internxt.cloud.documents.crypto

import org.bouncycastle.crypto.digests.RIPEMD160Digest

object Ripemd160 {

    fun digest(input: ByteArray): ByteArray {
        val md = RIPEMD160Digest()
        md.update(input, 0, input.size)
        val out = ByteArray(md.digestSize)
        md.doFinal(out, 0)
        return out
    }
}
