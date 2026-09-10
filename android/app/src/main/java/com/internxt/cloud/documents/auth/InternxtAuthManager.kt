package com.internxt.cloud.documents.auth

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.internxt.cloud.BuildConfig
import com.internxt.cloud.documents.api.AuthConfig
import java.io.IOException
import java.security.GeneralSecurityException

class InternxtAuthManager(private val prefs: SharedPreferences) {

    data class Credentials(
        val bearerToken: String,
        val userId: String,
        val bridgeUser: String,
        val mnemonic: String,
        val rootFolderUuid: String,
        val email: String?,
        val driveBaseUrl: String,
        val bridgeBaseUrl: String,
        val desktopToken: String?,
    )

    fun isLoggedIn(): Boolean =
        REQUIRED_KEYS.all { !prefs.getString(it, null).isNullOrBlank() }

    fun rootFolderUuid(): String? = prefs.getString(KEY_ROOT_FOLDER_UUID, null)?.takeIf { it.isNotBlank() }

    fun authenticatedRootUuid(): String? = if (isLoggedIn()) rootFolderUuid() else null

    fun userEmail(): String? = prefs.getString(KEY_EMAIL, null)?.takeIf { it.isNotBlank() }

    fun loadAuthConfig(): AuthConfig? {
        if (!isLoggedIn()) return null
        return AuthConfig(
            driveBaseUrl = required(KEY_DRIVE_BASE_URL),
            bridgeBaseUrl = required(KEY_BRIDGE_BASE_URL),
            bearerToken = required(KEY_BEARER_TOKEN),
            bridgeUser = required(KEY_BRIDGE_USER),
            userId = required(KEY_USER_ID),
            mnemonic = required(KEY_MNEMONIC),
            clientName = BuildConfig.INTERNXT_CLIENT_NAME,
            clientVersion = BuildConfig.INTERNXT_CLIENT_VERSION,
            desktopToken = prefs.getString(KEY_DESKTOP_TOKEN, null)?.takeIf { it.isNotBlank() },
        )
    }

    private fun required(key: String): String =
        prefs.getString(key, null) ?: error("$key missing after isLoggedIn() returned true")

    fun saveCredentials(creds: Credentials): Boolean =
        prefs.edit()
            .putString(KEY_BEARER_TOKEN, creds.bearerToken)
            .putString(KEY_USER_ID, creds.userId)
            .putString(KEY_BRIDGE_USER, creds.bridgeUser)
            .putString(KEY_MNEMONIC, creds.mnemonic)
            .putString(KEY_ROOT_FOLDER_UUID, creds.rootFolderUuid)
            .putString(KEY_EMAIL, creds.email)
            .putString(KEY_DRIVE_BASE_URL, creds.driveBaseUrl)
            .putString(KEY_BRIDGE_BASE_URL, creds.bridgeBaseUrl)
            .putString(KEY_DESKTOP_TOKEN, creds.desktopToken)
            .commit()

    fun clear(): Boolean = prefs.edit().clear().commit()

    companion object {
        private const val TAG = "InternxtAuthManager"
        private const val PREFS_FILE = "internxt_documents_auth"

        private const val KEY_BEARER_TOKEN = "bearerToken"
        private const val KEY_USER_ID = "userId"
        private const val KEY_BRIDGE_USER = "bridgeUser"
        private const val KEY_MNEMONIC = "mnemonic"
        private const val KEY_ROOT_FOLDER_UUID = "rootFolderUuid"
        private const val KEY_EMAIL = "email"
        private const val KEY_DRIVE_BASE_URL = "driveBaseUrl"
        private const val KEY_BRIDGE_BASE_URL = "bridgeBaseUrl"
        private const val KEY_DESKTOP_TOKEN = "desktopToken"

        private val REQUIRED_KEYS = listOf(
            KEY_BEARER_TOKEN,
            KEY_USER_ID,
            KEY_BRIDGE_USER,
            KEY_MNEMONIC,
            KEY_ROOT_FOLDER_UUID,
            KEY_DRIVE_BASE_URL,
            KEY_BRIDGE_BASE_URL,
        )

        fun create(context: Context): InternxtAuthManager? {
            return try {
                val masterKey = MasterKey.Builder(context)
                    .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                    .build()
                val prefs = EncryptedSharedPreferences.create(
                    context,
                    PREFS_FILE,
                    masterKey,
                    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
                )
                InternxtAuthManager(prefs)
            } catch (e: GeneralSecurityException) {
                Log.e(TAG, "Keystore unavailable, SAF auth disabled", e)
                null
            } catch (e: IOException) {
                Log.e(TAG, "Could not open encrypted prefs, SAF auth disabled", e)
                null
            }
        }
    }
}
