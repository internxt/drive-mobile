package com.internxt.cloud.auth

import android.provider.DocumentsContract
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.internxt.cloud.documents.InternxtDocumentsProvider
import com.internxt.cloud.documents.auth.InternxtAuthManager

class InternxtAuthCredentialsModule(private val ctx: ReactApplicationContext) :
    ReactContextBaseJavaModule(ctx) {

    private val authManager by lazy { InternxtAuthManager.create(ctx.applicationContext) }

    override fun getName() = MODULE_NAME

    @ReactMethod
    fun setCredentials(map: ReadableMap, promise: Promise) {
        try {
            val creds = InternxtAuthManager.Credentials(
                bearerToken = map.requireString("bearerToken"),
                userId = map.requireString("userId"),
                bridgeUser = map.requireString("bridgeUser"),
                rootFolderUuid = map.requireString("rootFolderUuid"),
                email = map.optString("email"),
                driveBaseUrl = map.requireString("driveBaseUrl"),
                bridgeBaseUrl = map.requireString("bridgeBaseUrl"),
                desktopToken = map.optString("desktopToken"),
            )
            authManager.saveCredentials(creds)
            notifyRootsChanged()
            promise.resolve(null)
        } catch (e: IllegalArgumentException) {
            promise.reject("E_MISSING_FIELD", e.message, e)
        } catch (e: Exception) {
            promise.reject("E_SAVE_CREDENTIALS", e.message, e)
        }
    }

    @ReactMethod
    fun clearCredentials(promise: Promise) {
        try {
            authManager.clear()
            notifyRootsChanged()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("E_CLEAR_CREDENTIALS", e.message, e)
        }
    }

    private fun notifyRootsChanged() {
        ctx.contentResolver.notifyChange(
            DocumentsContract.buildRootsUri(InternxtDocumentsProvider.AUTHORITY),
            null,
        )
    }

    private fun ReadableMap.nonBlankString(key: String): String? =
        if (hasKey(key) && !isNull(key)) getString(key)?.takeIf { it.isNotBlank() } else null

    private fun ReadableMap.requireString(key: String): String =
        nonBlankString(key) ?: throw IllegalArgumentException("Missing or blank credential field: $key")

    private fun ReadableMap.optString(key: String): String? = nonBlankString(key)

    companion object {
        const val MODULE_NAME = "InternxtAuthCredentialsModule"
    }
}
