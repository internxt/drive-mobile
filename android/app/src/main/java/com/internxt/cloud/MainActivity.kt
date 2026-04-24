package com.internxt.cloud

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.OpenableColumns
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import expo.modules.ReactActivityDelegateWrapper
import expo.modules.splashscreen.SplashScreenManager

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    // @generated begin expo-splashscreen - expo prebuild (DO NOT MODIFY)
    // sync-f3ff59a738c56c9a6119210cb55f0b613eb8b6af
    SplashScreenManager.registerOnActivity(this)
    // @generated end expo-splashscreen
    super.onCreate(null)
    parseShareIntent(intent)
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    val files = parseShareIntent(intent) ?: return
    ShareIntentModule.emitFilesIfReady(files)
  }

  override fun getMainComponentName(): String = "main"

  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
            this,
            BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
            object : DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled) {}
    )
  }

  override fun invokeDefaultOnBackPressed() {
    if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
      if (!moveTaskToBack(false)) {
        super.invokeDefaultOnBackPressed()
      }
      return
    }
    super.invokeDefaultOnBackPressed()
  }

  private fun parseShareIntent(intent: Intent): WritableArray? {
    val action = intent.action ?: return null
    if (action != Intent.ACTION_SEND && action != Intent.ACTION_SEND_MULTIPLE) return null

    val uris = mutableListOf<Uri>()
    val mimeType = intent.type

    if (action == Intent.ACTION_SEND) {
      val uri = getParcelableUri(intent) ?: return null
      uris.add(uri)
    } else {
      val list = getParcelableUriList(intent) ?: return null
      uris.addAll(list)
    }

    val files = mutableListOf<Map<String, String?>>()
    for (uri in uris) {
      files.add(
              mapOf(
                      "uri" to uri.toString(),
                      "mimeType" to mimeType,
                      "fileName" to resolveFileName(uri)
              )
      )
    }

    ShareIntentModule.pendingFiles = files

    val array = Arguments.createArray()
    for (file in files) {
      val map = Arguments.createMap()
      file.forEach { (k, v) -> if (v != null) map.putString(k, v) else map.putNull(k) }
      array.pushMap(map)
    }
    return array
  }

  private fun resolveFileName(uri: Uri): String? {
    return try {
      contentResolver.query(uri, null, null, null, null)?.use { cursor ->
        if (!cursor.moveToFirst()) return null
        val idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
        if (idx < 0) null else cursor.getString(idx)
      }
    } catch (e: Exception) {
      null
    }
  }

  @Suppress("DEPRECATION")
  private fun getParcelableUri(intent: Intent): Uri? =
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU)
                  intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri::class.java)
          else intent.getParcelableExtra(Intent.EXTRA_STREAM)

  @Suppress("DEPRECATION")
  private fun getParcelableUriList(intent: Intent): ArrayList<Uri>? =
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU)
                  intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM, Uri::class.java)
          else intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM)
}
