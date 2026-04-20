package com.internxt.cloud.documents.api

data class AuthConfig(
    val driveBaseUrl: String,
    val bridgeBaseUrl: String,
    val bearerToken: String,
    val bridgeUser: String,
    val userId: String,
    val clientName: String = "drive-mobile",
    val clientVersion: String = "v1.9.0",
    val desktopToken: String? = null
)
