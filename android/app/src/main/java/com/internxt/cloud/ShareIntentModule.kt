package com.internxt.cloud

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.modules.core.DeviceEventManagerModule

class ShareIntentModule(private val ctx: ReactApplicationContext) :
    ReactContextBaseJavaModule(ctx) {

    companion object {
        var pendingFiles: List<Map<String, String?>>? = null
        private var instance: ShareIntentModule? = null

        fun emitFilesIfReady(files: WritableArray) {
            instance?.emit(files)
        }
    }

    init {
        instance = this
    }

    override fun getName() = "ShareIntentModule"

    @ReactMethod
    fun getSharedFiles(promise: Promise) {
        val files = pendingFiles
        pendingFiles = null
        if (files == null) {
            promise.resolve(null)
            return
        }
        val array = Arguments.createArray()
        for (file in files) {
            val map = Arguments.createMap()
            file.forEach { (k, v) -> if (v != null) map.putString(k, v) else map.putNull(k) }
            array.pushMap(map)
        }
        promise.resolve(array)
    }

    private fun emit(files: WritableArray) {
        ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("ShareIntentReceived", files)
    }
}
