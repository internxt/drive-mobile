package com.internxt.cloud.documents.api

import java.io.IOException

sealed class InternxtApiException(message: String, cause: Throwable? = null) : IOException(message, cause) {
    class UnauthorizedException(message: String = "401 Unauthorized") : InternxtApiException(message)
    class NotFoundException(message: String = "404 Not Found") : InternxtApiException(message)
    class ApiError(val code: Int, val body: String?) : InternxtApiException("HTTP $code: ${body ?: ""}")
    class NetworkException(cause: Throwable) : InternxtApiException("Network error", cause)
}
