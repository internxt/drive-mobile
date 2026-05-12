package com.internxt.cloud.documents.cache

import android.content.Context
import java.io.File

object DocumentCache {

    private const val ROOT_DIR = "internxt_documents"
    private const val CACHE_DIR = "cache"
    private const val TMP_DIR = "tmp"
    private const val DEC_SUFFIX = ".dec"
    private const val ENC_SUFFIX = ".enc"

    fun cacheFileFor(context: Context, uuid: String, updatedAt: String): File {
        val dir = File(context.cacheDir, "$ROOT_DIR/$CACHE_DIR").apply { mkdirs() }
        return File(dir, "${uuid}_${slugFromUpdatedAt(updatedAt)}$DEC_SUFFIX")
    }

    fun tempPaths(context: Context, uuid: String): Pair<File, File> {
        val dir = File(context.cacheDir, "$ROOT_DIR/$TMP_DIR").apply { mkdirs() }
        val token = "${uuid}_${System.nanoTime()}"
        return File(dir, "$token$ENC_SUFFIX") to File(dir, "$token$DEC_SUFFIX")
    }

    fun pruneSiblings(context: Context, uuid: String, keep: File) {
        val dir = File(context.cacheDir, "$ROOT_DIR/$CACHE_DIR")
        val children = dir.listFiles() ?: return
        for (file in children) {
            if (file == keep) continue
            if (file.name.startsWith("${uuid}_") && file.name.endsWith(DEC_SUFFIX)) {
                file.delete()
            }
        }
    }

    fun deleteTempsFor(context: Context, uuid: String) {
        val dir = File(context.cacheDir, "$ROOT_DIR/$TMP_DIR")
        val children = dir.listFiles() ?: return
        for (file in children) {
            if (file.name.startsWith("${uuid}_")) file.delete()
        }
    }

    fun slugFromUpdatedAt(updatedAt: String): String {
        val sb = StringBuilder(updatedAt.length)
        for (c in updatedAt) {
            if (c.isLetterOrDigit()) sb.append(c)
        }
        return if (sb.isEmpty()) "0" else sb.toString()
    }
}
