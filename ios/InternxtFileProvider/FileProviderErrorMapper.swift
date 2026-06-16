//
//  FileProviderErrorMapper.swift
//  InternxtFileProvider
//
//  Created by Ramon Candel on 9/4/26.
//

import FileProvider
import InternxtSwiftCore

enum FileProviderErrorMapper {
    private static let offlineURLErrorCodes: Set<URLError.Code> = [
        .notConnectedToInternet,
        .networkConnectionLost,
        .timedOut,
        .cannotConnectToHost,
        .dataNotAllowed,
        .cannotFindHost
    ]

    private static let offlineErrorCodes: Set<ErrorCode> = [
        .networkNoConnection,
        .networkConnectionLost,
        .networkTimeout,
        .networkCannotConnect
    ]

    static func lookupError(from error: Error) -> Error {
        if let alreadyMapped = error as? NSFileProviderError {
            return alreadyMapped
        }
        if isUnauthorized(error) {
            return NSFileProviderError(.notAuthenticated)
        }
        if isOffline(error) {
            return NSFileProviderError(.serverUnreachable)
        }
        if isNameCollision(error) {
            return NSFileProviderError(.filenameCollision)
        }
        return NSFileProviderError(.noSuchItem)
    }

    static func isNameCollision(_ error: Error) -> Bool {
        if let enriched = error as? EnrichedError {
            if let cause = enriched.cause {
                return isNameCollision(cause)
            }
            return false
        }
        if let apiError = error as? APIClientError {
            return apiError.statusCode == 409
        }
        return false
    }

    static func isUnauthorized(_ error: Error) -> Bool {
        if let enriched = error as? EnrichedError {
            if enriched.code == .apiUnauthorized {
                return true
            }
            if let cause = enriched.cause {
                return isUnauthorized(cause)
            }
            return false
        }
        if let apiError = error as? APIClientError {
            return apiError.statusCode == 401
        }
        return false
    }

    static func isOffline(_ error: Error) -> Bool {
        if let enriched = error as? EnrichedError {
            if offlineErrorCodes.contains(enriched.code) {
                return true
            }
            if let cause = enriched.cause {
                return isOffline(cause)
            }
            return false
        }
        if let urlError = error as? URLError {
            return offlineURLErrorCodes.contains(urlError.code)
        }
        if let apiError = error as? APIClientError {
            return apiError.statusCode <= 0
        }
        return false
    }
}
