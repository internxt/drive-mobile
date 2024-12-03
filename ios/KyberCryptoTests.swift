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
        XCTAssertEqual(keyPair?.publicKey.count ?? 0 > 0, true, "Public key should be non-empty")
        XCTAssertEqual(keyPair?.privateKey.count ?? 0 > 0, true, "Private key should be non-empty")
        XCTAssertNotNil(keyPair, "Key pair generation failed unexpectedly")
        XCTAssertEqual(keyPair?.publicKey.count ?? 0 > 0, true, "Expected a non-empty public key")
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
    func testInvalidKeySize() {
        let kyber = KyberCrypto()
        kyber.keySize = 999 // Invalid key size
        let keyPair = kyber.generateAsymmetricKeyPair()
        XCTAssertNil(keyPair, "Key generation should fail for invalid key size")

    }

    func testKyberEncryptionManager() {
        let message = "Hello, Kyber!".data(using: .utf8)!
        guard let keyPair = KyberCrypto().generateAsymmetricKeyPair() else {
            XCTFail("Key generation failed")
            return
        }

        do {
            let encryptionResult = try KyberEncryptionManager.encryptMessage(message, with: keyPair.publicKey)
            let decryptionResult = try KyberEncryptionManager.decryptCiphertext(encryptionResult.ciphertext, with: keyPair.privateKey)

            XCTAssertEqual(decryptionResult.message, message, "Decrypted message should match the original")
        } catch {
            XCTFail("Encryption/Decryption failed with error: \(error)")
        }
    }

    func testDynamicKeySizes() {
        let sizes = [512, 768, 1024]
        for size in sizes {
            let kyber = KyberCrypto()
            let keyPair = kyber.generateAsymmetricKeyPair(size: size)
            XCTAssertNotNil(keyPair, "Key pair generation should work for size \(size)")
        }
    }

     func testCustomConfig() {
        let config = KyberConfig(keySize: 1024)
        let kyber = KyberCrypto(config: config)
        let keyPair = kyber.generateAsymmetricKeyPair()
        XCTAssertNotNil(keyPair, "Key pair generation should succeed with custom config")
    }

     func testKeyPairClearing() {
        let kyber = KyberCrypto()
        guard let keyPair = kyber.generateAsymmetricKeyPair() else {
            XCTFail("Key generation failed")
            return
        }

        kyber.clearKeyPair(keyPair)
        XCTAssertEqual(keyPair.publicKey.count, 0, "Public key should be cleared")
        XCTAssertEqual(keyPair.privateKey.count, 0, "Private key should be cleared")
    }

    func testExportKeys() {
        let kyber = KyberCrypto()
        guard let keyPair = kyber.generateAsymmetricKeyPair() else {
            XCTFail("Key generation failed")
            return
        }

        let publicKeyString = kyber.exportPublicKey(keyPair.publicKey)
        let privateKeyString = kyber.exportPrivateKey(keyPair.privateKey)

        XCTAssertNotNil(publicKeyString, "Public key export should not be nil")
        XCTAssertNotNil(privateKeyString, "Private key export should not be nil")
    }

    func testImportKeys() {
        let kyber = KyberCrypto()
        guard let keyPair = kyber.generateAsymmetricKeyPair() else {
            XCTFail("Key generation failed")
            return
        }

        let publicKeyString = kyber.exportPublicKey(keyPair.publicKey)
        let privateKeyString = kyber.exportPrivateKey(keyPair.privateKey)

        let importedPublicKey = kyber.importPublicKey(publicKeyString)
        let importedPrivateKey = kyber.importPrivateKey(privateKeyString)

        XCTAssertEqual(importedPublicKey, keyPair.publicKey, "Imported public key should match original")
        XCTAssertEqual(importedPrivateKey, keyPair.privateKey, "Imported private key should match original")
    }
    func testSigningAndVerification() {
        let kyber = KyberCrypto()
        guard let keyPair = kyber.generateAsymmetricKeyPair() else {
            XCTFail("Key generation failed")
            return
        }

        let message = "Sign this message".data(using: .utf8)!
        guard let signature = kyber.signMessage(message, using: keyPair.privateKey) else {
            XCTFail("Signing failed")
            return
        }

        let isValid = kyber.verifySignature(signature, for: message, using: keyPair.publicKey)
        XCTAssertTrue(isValid, "Signature verification should succeed")
    }

    func testConfigExportAndImport() {
        let kyber = KyberCrypto()
        guard let exportedConfig = kyber.exportConfig() else {
            XCTFail("Config export failed")
            return
        }

        guard let importedConfig = kyber.importConfig(from: exportedConfig) else {
            XCTFail("Config import failed")
            return
        }

        XCTAssertEqual(importedConfig.keySize, KyberDefaults.defaultKeySize, "Imported config should match exported")
    }

    func testConfigExportAndImport() {
        let kyber = KyberCrypto()
        guard let exportedConfig = kyber.exportConfig() else {
            XCTFail("Config export failed")
            return
        }

        guard let importedConfig = kyber.importConfig(from: exportedConfig) else {
            XCTFail("Config import failed")
            return
        }

        XCTAssertEqual(importedConfig.keySize, KyberDefaults.defaultKeySize, "Imported config should match exported")
    }

}
