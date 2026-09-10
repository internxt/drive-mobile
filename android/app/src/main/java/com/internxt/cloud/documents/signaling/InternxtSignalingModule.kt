package com.internxt.cloud.documents.signaling

import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.internxt.cloud.documents.InternxtDocumentsProvider

class InternxtSignalingModule(ctx: ReactApplicationContext) :
    ReactContextBaseJavaModule(ctx) {

    override fun getName() = MODULE_NAME

    @ReactMethod
    fun notifyParentChanged(parentFolderUuid: String?, promise: Promise) {
        val folderUuid = parentFolderUuid?.takeIf { it.isNotBlank() } ?: run {
            promise.reject("E_INVALID_FOLDER", "parentFolderUuid must be a non-empty string")
            return
        }
        signalParent(folderUuid, promise)
    }

    private fun signalParent(folderUuid: String, promise: Promise) {
        try {
            InternxtDocumentsProvider.signalParentChanged(folderUuid)
            promise.resolve(null)
        } catch (e: Exception) {
            // Best-effort signal: never let a failed refresh break the JS caller.
            Log.w(TAG, "signalParent failed for $folderUuid", e)
            promise.resolve(null)
        }
    }

    companion object {
        const val MODULE_NAME = "InternxtSignalingModule"
        private const val TAG = "InternxtSignaling"
    }
}
