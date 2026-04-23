package com.internxt.cloud.documents.auth

import android.content.SharedPreferences
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class InternxtAuthManagerTest {

    private lateinit var prefs: FakeSharedPreferences
    private lateinit var manager: InternxtAuthManager

    companion object {
        private val FULL_CREDS = InternxtAuthManager.Credentials(
            bearerToken = "bearer-xyz",
            userId = "user-1",
            bridgeUser = "user@example.com",
            rootFolderUuid = "root-uuid",
            email = "user@example.com",
            driveBaseUrl = "https://drive.test/api",
            bridgeBaseUrl = "https://bridge.test",
            desktopToken = "desktop-tok",
        )
    }

    @Before
    fun setUp() {
        prefs = FakeSharedPreferences()
        manager = InternxtAuthManager(prefs)
    }

    @Test
    fun isLoggedInFalseWhenPrefsEmpty() {
        assertFalse(manager.isLoggedIn())
        assertNull(manager.rootFolderUuid())
        assertNull(manager.userEmail())
        assertNull(manager.loadAuthConfig())
    }

    @Test
    fun isLoggedInTrueAfterSavingFullCredentials() {
        manager.saveCredentials(FULL_CREDS)

        assertTrue(manager.isLoggedIn())
        assertEquals("root-uuid", manager.rootFolderUuid())
        assertEquals("user@example.com", manager.userEmail())
    }

    @Test
    fun loadAuthConfigReturnsExpectedFields() {
        manager.saveCredentials(FULL_CREDS)

        val config = manager.loadAuthConfig()!!
        assertEquals("https://drive.test/api", config.driveBaseUrl)
        assertEquals("https://bridge.test", config.bridgeBaseUrl)
        assertEquals("bearer-xyz", config.bearerToken)
        assertEquals("user@example.com", config.bridgeUser)
        assertEquals("user-1", config.userId)
        assertEquals("desktop-tok", config.desktopToken)
    }

    @Test
    fun loadAuthConfigOmitsDesktopTokenWhenBlank() {
        manager.saveCredentials(FULL_CREDS.copy(desktopToken = null))

        val config = manager.loadAuthConfig()!!
        assertNull(config.desktopToken)
    }

    @Test
    fun isLoggedInFalseWhenAnyRequiredFieldMissing() {
        val requiredMissing = listOf(
            FULL_CREDS.copy(bearerToken = ""),
            FULL_CREDS.copy(userId = ""),
            FULL_CREDS.copy(bridgeUser = ""),
            FULL_CREDS.copy(rootFolderUuid = ""),
            FULL_CREDS.copy(driveBaseUrl = ""),
            FULL_CREDS.copy(bridgeBaseUrl = ""),
        )
        for (creds in requiredMissing) {
            prefs = FakeSharedPreferences()
            manager = InternxtAuthManager(prefs)
            manager.saveCredentials(creds)

            assertFalse("should be logged out when field blank: $creds", manager.isLoggedIn())
            assertNull(manager.loadAuthConfig())
        }
    }

    @Test
    fun clearRemovesAllCredentials() {
        manager.saveCredentials(FULL_CREDS)
        assertTrue(manager.isLoggedIn())

        manager.clear()

        assertFalse(manager.isLoggedIn())
        assertNull(manager.rootFolderUuid())
        assertNull(manager.userEmail())
        assertNull(manager.loadAuthConfig())
    }

    @Test
    fun savingOverwritesPreviousCredentials() {
        manager.saveCredentials(FULL_CREDS)
        manager.saveCredentials(FULL_CREDS.copy(bearerToken = "new-token", rootFolderUuid = "new-root"))

        assertEquals("new-token", manager.loadAuthConfig()!!.bearerToken)
        assertEquals("new-root", manager.rootFolderUuid())
    }
}

private class FakeSharedPreferences : SharedPreferences {
    private val store = HashMap<String, Any?>()

    override fun getAll(): MutableMap<String, *> = HashMap(store)
    override fun getString(key: String?, defValue: String?): String? =
        store[key] as? String ?: defValue

    override fun getStringSet(key: String?, defValues: MutableSet<String>?): MutableSet<String>? =
        @Suppress("UNCHECKED_CAST") (store[key] as? MutableSet<String>) ?: defValues

    override fun getInt(key: String?, defValue: Int): Int = (store[key] as? Int) ?: defValue
    override fun getLong(key: String?, defValue: Long): Long = (store[key] as? Long) ?: defValue
    override fun getFloat(key: String?, defValue: Float): Float = (store[key] as? Float) ?: defValue
    override fun getBoolean(key: String?, defValue: Boolean): Boolean = (store[key] as? Boolean) ?: defValue
    override fun contains(key: String?): Boolean = store.containsKey(key)
    override fun registerOnSharedPreferenceChangeListener(listener: SharedPreferences.OnSharedPreferenceChangeListener?) = Unit
    override fun unregisterOnSharedPreferenceChangeListener(listener: SharedPreferences.OnSharedPreferenceChangeListener?) = Unit

    override fun edit(): SharedPreferences.Editor = FakeEditor(store)

    private class FakeEditor(private val store: HashMap<String, Any?>) : SharedPreferences.Editor {
        private val pending = HashMap<String, Any?>()
        private val removed = HashSet<String>()
        private var clearPending = false

        override fun putString(key: String, value: String?) = apply { pending[key] = value }
        override fun putStringSet(key: String, values: MutableSet<String>?) = apply { pending[key] = values }
        override fun putInt(key: String, value: Int) = apply { pending[key] = value }
        override fun putLong(key: String, value: Long) = apply { pending[key] = value }
        override fun putFloat(key: String, value: Float) = apply { pending[key] = value }
        override fun putBoolean(key: String, value: Boolean) = apply { pending[key] = value }
        override fun remove(key: String) = apply { removed.add(key) }
        override fun clear() = apply { clearPending = true }

        override fun commit(): Boolean {
            applyChanges()
            return true
        }

        override fun apply() {
            applyChanges()
        }

        private fun applyChanges() {
            if (clearPending) store.clear()
            for (k in removed) store.remove(k)
            for ((k, v) in pending) {
                if (v == null) store.remove(k) else store[k] = v
            }
        }
    }
}
