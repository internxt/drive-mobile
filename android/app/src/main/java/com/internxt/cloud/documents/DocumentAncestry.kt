package com.internxt.cloud.documents

internal object DocumentAncestry {

    private const val MAX_HOPS = 64

    fun isDescendant(childUuid: String, parentUuid: String, parentOf: (String) -> String?): Boolean {
        if (childUuid == parentUuid) return true
        val visited = mutableSetOf(childUuid)
        var current = childUuid
        repeat(MAX_HOPS) {
            val next = parentOf(current) ?: return false
            if (next == parentUuid) return true
            if (!visited.add(next)) return false
            current = next
        }
        return false
    }
}
