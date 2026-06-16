//
//  FileProviderErrorMapperTests.swift
//  InternxtFileProviderTests
//

import XCTest
import FileProvider
import InternxtSwiftCore

final class FileProviderErrorMapperTests: XCTestCase {

    private func enriched(_ code: ErrorCode, cause: Error? = nil) -> EnrichedError {
        EnrichedError(code: code, step: .downloadGetInfo, cause: cause)
    }

    private func apiError(statusCode: Int) -> APIClientError {
        APIClientError(statusCode: statusCode, message: "test")
    }

    private func nsError(from error: Error) -> NSError {
        FileProviderErrorMapper.lookupError(from: error) as NSError
    }

    private func assertCode(
        _ error: Error,
        _ expected: NSFileProviderError.Code,
        file: StaticString = #filePath,
        line: UInt = #line
    ) {
        let mapped = nsError(from: error)
        XCTAssertEqual(mapped.domain, NSFileProviderErrorDomain, file: file, line: line)
        XCTAssertEqual(mapped.code, expected.rawValue, file: file, line: line)
    }

    func testWhenEnrichedApiUnauthorizedThenNotAuthenticated() {
        assertCode(enriched(.apiUnauthorized), .notAuthenticated)
    }

    func testWhenApiClientError401ThenNotAuthenticated() {
        assertCode(apiError(statusCode: 401), .notAuthenticated)
    }

    func testWhenEnrichedCauseIsUnauthorizedThenNotAuthenticated() {
        let nested = enriched(.downloadInfoFailed, cause: apiError(statusCode: 401))
        assertCode(nested, .notAuthenticated)
    }

    func testWhenDeeplyNestedCauseIsUnauthorizedThenNotAuthenticated() {
        let leaf = enriched(.apiUnauthorized)
        let middle = enriched(.downloadMirrorsFailed, cause: leaf)
        let root = enriched(.downloadFailed, cause: middle)
        assertCode(root, .notAuthenticated)
    }

    func testWhenEnrichedNetworkCodesThenServerUnreachable() {
        let offlineCodes: [ErrorCode] = [
            .networkNoConnection,
            .networkConnectionLost,
            .networkTimeout,
            .networkCannotConnect
        ]
        for code in offlineCodes {
            assertCode(enriched(code), .serverUnreachable)
        }
    }

    func testWhenApiClientErrorStatusCodeZeroOrNegativeThenServerUnreachable() {
        for statusCode in [0, -1, -2] {
            assertCode(apiError(statusCode: statusCode), .serverUnreachable)
        }
    }

    func testWhenURLErrorOfflineCodesThenServerUnreachable() {
        let offlineURLCodes: [URLError.Code] = [
            .notConnectedToInternet,
            .networkConnectionLost,
            .timedOut,
            .cannotConnectToHost,
            .dataNotAllowed,
            .cannotFindHost
        ]
        for code in offlineURLCodes {
            assertCode(URLError(code), .serverUnreachable)
        }
    }

    func testWhenEnrichedCauseIsOfflineURLErrorThenServerUnreachable() {
        let nested = enriched(.downloadInfoFailed, cause: URLError(.notConnectedToInternet))
        assertCode(nested, .serverUnreachable)
    }

    func testWhenUnknownEnrichedCodeWithoutCauseThenNoSuchItem() {
        assertCode(enriched(.apiNotFound), .noSuchItem)
    }

    func testWhenApiClientErrorNonAuthPositiveStatusThenNoSuchItem() {
        assertCode(apiError(statusCode: 500), .noSuchItem)
    }

    func testWhenUnrelatedErrorThenNoSuchItem() {
        assertCode(URLError(.badURL), .noSuchItem)
    }
}
