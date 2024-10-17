import Foundation
import SwiftKyber

enum KyberError: Error {
    case keyGenerationFailed
    case encryptionFailed
    case decryptionFailed
    case invalidKeySize
}

struct KyberErrorMessages {
    static let keyGenerationFailed = "Key generation failed"
    static let encryptionFailed = "Encryption failed"
    static let decryptionFailed = "Decryption failed"
    static let invalidKeySize = "Invalid key size"
}

struct KyberDefaults {
    static let defaultKeySize = 768
    static let supportedKeySizes = [512, 768, 1024]
}
struct KyberConfig {
    let keySize: Int
}
class KyberCrypto {
    private let config: KyberConfig
    private let keySize = KyberDefaults.defaultKeySize

    init(config: KyberConfig = KyberConfig(keySize: KyberDefaults.defaultKeySize)) {
        self.config = config
    }

    private func isValidKeySize(_ size: Int) -> Bool {
        return KyberDefaults.supportedKeySizes.contains(size)
    }
    static func generateKeyPair(size: Int) throws -> (publicKey: Data, privateKey: Data) {
        return try Kyber.generateKeyPair(keySize: size)
    }

    private var validKeySizes: Set<Int> = [512, 768, 1024]

    private func isValidKeySize(_ size: Int) -> Bool {
        return validKeySizes.contains(size)
    }


    func exportPublicKey(_ publicKey: Data) -> String {
        return publicKey.base64EncodedString()
    }

    func exportPrivateKey(_ privateKey: Data) -> String {
        return privateKey.base64EncodedString()
    }

     func importPublicKey(_ publicKeyString: String) -> Data? {
        return Data(base64Encoded: publicKeyString)
    }
    
    func importPrivateKey(_ privateKeyString: String) -> Data? {
        return Data(base64Encoded: privateKeyString)
    }

    // Helper function to handle base64 encoding/decoding for debug logging
     private func base64String(from data: Data) -> String {
         return data.base64EncodedString()
     }

     // Log errors in a consistent format
    private func logError(_ error: KyberError, additionalInfo: String? = nil) {
        var message = "Kyber Error: \(error)"
        if let info = additionalInfo {
            message += " - \(info)"
        }
        print(message)
    }
  
    // Generate a public-private key pair for asymmetric encryption
    // - Returns: A tuple containing the public key and private key as Data, or nil in case of an error.
    func generateAsymmetricKeyPair() -> (publicKey: Data, privateKey: Data)? {
        guard isValidKeySize(config.keySize) else {
            logError(.invalidKeySize)
            return nil
        }

        do {
            return try KyberKeyManager.generateKeyPair(size: config.keySize)
        } catch {
            logError(.keyGenerationFailed)
            return nil
        }
    }



    // Encrypt a message using a public key
    // - Parameters:
    //   - message: The data to encrypt.
    //   - publicKey: The public key used for encryption.
    // - Returns: A tuple containing the ciphertext and the shared secret, or nil in case of an error.
      func encryptMessage(_ message: Data, using publicKey: Data) -> (ciphertext: Data, sharedSecret: Data)? {
        do {
            return try KyberEncryptionManager.encryptMessage(message, with: publicKey)
        } catch {
            logError(.encryptionFailed)
            return nil
        }
    }


    // Decrypt a ciphertext using a private key
    // - Parameters:
    //   - ciphertext: The encrypted data to decrypt.
    //   - privateKey: The private key used for decryption.
    // - Returns: A tuple containing the original message and the shared secret, or nil in case of an error.
    func decryptCiphertext(_ ciphertext: Data, using privateKey: Data) -> (message: Data, sharedSecret: Data)? {
        do {
            return try KyberEncryptionManager.decryptCiphertext(ciphertext, with: privateKey)
        } catch {
            logError(.decryptionFailed)
            return nil
        }
    }

   func clearKeyPair(_ keyPair: (publicKey: Data, privateKey: Data)) {
        keyPair.publicKey.resetBytes(in: 0..<keyPair.publicKey.count)
        keyPair.privateKey.resetBytes(in: 0..<keyPair.privateKey.count)
    }

    func signMessage(_ message: Data, using privateKey: Data) -> Data? {
        do {
            return try Kyber.sign(message: message, privateKey: privateKey)
        } catch {
            logError(.encryptionFailed, additionalInfo: "Failed to sign message")
            return nil
        }
    }


}
