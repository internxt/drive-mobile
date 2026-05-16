package com.internxt.cloud.documents.api

data class AuthConfig(
    val driveBaseUrl: String,
    val bridgeBaseUrl: String,
    val bearerToken: String,
    val bridgeUser: String,
    val userId: String,
    val clientName: String,
    val clientVersion: String,
    val desktopToken: String? = null
)
