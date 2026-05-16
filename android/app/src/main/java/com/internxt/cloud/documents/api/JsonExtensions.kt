package com.internxt.cloud.documents.api

import org.json.JSONArray
import org.json.JSONObject

internal fun JSONArray?.orEmpty(): JSONArray = this ?: JSONArray()

internal inline fun <T> JSONArray.map(transform: (JSONObject) -> T): List<T> {
    val out = ArrayList<T>(length())
    for (i in 0 until length()) out.add(transform(getJSONObject(i)))
    return out
}

internal fun JSONObject.optStringOrNull(key: String): String? =
    if (isNull(key)) null else optString(key).takeIf { it.isNotEmpty() }

internal fun JSONObject.optLongFlexible(key: String): Long = when (val v = opt(key)) {
    is Number -> v.toLong()
    is String -> v.toLongOrNull() ?: 0L
    else -> 0L
}
