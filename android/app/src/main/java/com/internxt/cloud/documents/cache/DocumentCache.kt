package com.internxt.cloud.documents.cache

import android.content.Context
import java.io.File

object DocumentCache {

    private const val ROOT_DIR = "internxt_documents"
    private const val CACHE_DIR = "cache"
    private const val TMP_DIR = "tmp"
    private const val DEC_SUFFIX = ".dec"
    private const val ENC_SUFFIX = ".enc"

    fun cacheFileFor(context: Context, uuid: String, updatedAt: String): File =
        File(cacheDir(context), "${uuid}_${slugFromUpdatedAt(updatedAt)}$DEC_SUFFIX")

    fun existingCacheFor(context: Context, uuid: String): File? =
        cacheDir(context).listFiles()
            ?.filter { it.name.startsWith("${uuid}_") && it.name.endsWith(DEC_SUFFIX) && it.length() > 0 }
            ?.maxByOrNull { it.lastModified() }

    fun tempPaths(context: Context, uuid: String): Pair<File, File> {
        val dir = tmpDir(context)
        val token = "${uuid}_${System.nanoTime()}"
        return File(dir, "$token$ENC_SUFFIX") to File(dir, "$token$DEC_SUFFIX")
    }

    fun pruneSiblings(context: Context, uuid: String, keep: File) {
        deleteMatching(cacheDir(context)) {
            it != keep && it.name.startsWith("${uuid}_") && it.name.endsWith(DEC_SUFFIX)
        }
    }

    fun deleteTempsFor(context: Context, uuid: String) {
        deleteMatching(tmpDir(context)) { it.name.startsWith("${uuid}_") }
    }

    private fun cacheDir(context: Context): File =
        File(context.cacheDir, "$ROOT_DIR/$CACHE_DIR").apply { mkdirs() }

    private fun tmpDir(context: Context): File =
        File(context.cacheDir, "$ROOT_DIR/$TMP_DIR").apply { mkdirs() }

    private inline fun deleteMatching(dir: File, predicate: (File) -> Boolean) {
        dir.listFiles()?.forEach { if (predicate(it)) it.delete() }
    }

    private fun slugFromUpdatedAt(updatedAt: String): String =
        updatedAt.filter { it.isLetterOrDigit() }.ifEmpty { "0" }
}
