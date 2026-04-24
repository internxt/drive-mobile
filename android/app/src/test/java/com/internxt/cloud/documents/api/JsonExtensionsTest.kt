package com.internxt.cloud.documents.api

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test

class JsonExtensionsTest {

    @Test
    fun orEmptyReturnsEmptyArrayWhenNull() {
        val result = (null as JSONArray?).orEmpty()
        assertNotNull(result)
        assertEquals(0, result.length())
    }

    @Test
    fun orEmptyReturnsSameInstanceWhenNotNull() {
        val array = JSONArray().put("a")
        assertSame(array, array.orEmpty())
    }

    @Test
    fun mapTransformsEachElementPreservingOrder() {
        val array = JSONArray()
            .put(JSONObject().put("n", 1))
            .put(JSONObject().put("n", 2))
            .put(JSONObject().put("n", 3))

        val result = array.map { it.getInt("n") }

        assertEquals(listOf(1, 2, 3), result)
    }

    @Test
    fun mapReturnsEmptyListForEmptyArray() {
        val result = JSONArray().map { it.toString() }
        assertTrue(result.isEmpty())
    }

    @Test
    fun optStringOrNullReturnsNullForMissingKey() {
        assertNull(JSONObject().optStringOrNull("missing"))
    }

    @Test
    fun optStringOrNullReturnsNullForJsonNullValue() {
        val obj = JSONObject().put("key", JSONObject.NULL)
        assertNull(obj.optStringOrNull("key"))
    }

    @Test
    fun optStringOrNullReturnsNullForEmptyString() {
        val obj = JSONObject().put("key", "")
        assertNull(obj.optStringOrNull("key"))
    }

    @Test
    fun optStringOrNullReturnsValueForNonEmptyString() {
        val obj = JSONObject().put("key", "hello")
        assertEquals("hello", obj.optStringOrNull("key"))
    }

    @Test
    fun optLongFlexibleConvertsNumericValueToLong() {
        val obj = JSONObject().put("key", 42)
        assertEquals(42L, obj.optLongFlexible("key"))
    }

    @Test
    fun optLongFlexibleParsesNumericString() {
        val obj = JSONObject().put("key", "1024")
        assertEquals(1024L, obj.optLongFlexible("key"))
    }

    @Test
    fun optLongFlexibleReturnsZeroForNonNumericString() {
        val obj = JSONObject().put("key", "not-a-number")
        assertEquals(0L, obj.optLongFlexible("key"))
    }

    @Test
    fun optLongFlexibleReturnsZeroForMissingKey() {
        assertEquals(0L, JSONObject().optLongFlexible("missing"))
    }
}
