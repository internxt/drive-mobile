//
//  KyberCryptoTests.swift
//  Internxt
//
//

import XCTest
@testable import YourProjectName

class KyberCryptoTests: XCTestCase {
    func testKeyGeneration() {
        let kyber = KyberCrypto()
        let keyPair = kyber.generateAsymmetricKeyPair()
        XCTAssertNotNil(keyPair, "Key pair should not be nil")
        XCTAssertEqual(keyPair?.publicKey.count ?? 0 > 0, true, "Public key should be non-empty")
        XCTAssertEqual(keyPair?.privateKey.count ?? 0 > 0, true, "Private key should be non-empty")
    }
}
