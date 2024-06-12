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

    func testEncryption() {
        let kyber = KyberCrypto()
        guard let keyPair = kyber.generateAsymmetricKeyPair() else {
            XCTFail("Key generation failed")
            return
        }

        let message = "Test Message".data(using: .utf8)!
        let encryptionResult = kyber.encryptMessage(message, using: keyPair.publicKey)
        XCTAssertNotNil(encryptionResult, "Encryption result should not be nil")
        XCTAssertNotNil(encryptionResult?.ciphertext, "Ciphertext should not be nil")
    }

    func testDecryption() {
        let kyber = KyberCrypto()
        guard let keyPair = kyber.generateAsymmetricKeyPair() else {
            XCTFail("Key generation failed")
            return
        }

        let message = "Test Message".data(using: .utf8)!
        guard let encryptionResult = kyber.encryptMessage(message, using: keyPair.publicKey) else {
            XCTFail("Encryption failed")
            return
        }

        let decryptionResult = kyber.decryptCiphertext(encryptionResult.ciphertext, using: keyPair.privateKey)
        XCTAssertNotNil(decryptionResult, "Decryption result should not be nil")
        XCTAssertEqual(decryptionResult?.message, message, "Decrypted message should match the original")
    }

}
