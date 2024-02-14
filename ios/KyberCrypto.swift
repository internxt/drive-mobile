import Foundation
import SwiftKyber

class KyberCrypto {
    // Define key size (choose from 512, 768, or 1024 based on your requirements)
    private let keySize = 768

    // Generate a public-private key pair
    func generateKeyPair() -> (publicKey: Data, privateKey: Data)? {
        do {
            let keyPair = try Kyber.generateKeyPair(keySize: keySize)
            return (keyPair.publicKey, keyPair.privateKey)
        } catch {
            print("Error generating keys: \(error)")
            return nil
        }
    }

    // Encrypt data using the public key
    func encryptData(data: Data, publicKey: Data) -> (ciphertext: Data, sharedSecret: Data)? {
        do {
            let encryptionResult = try Kyber.encrypt(publicKey: publicKey, message: data)
            return (encryptionResult.ciphertext, encryptionResult.sharedSecret)
        } catch {
            print("Error encrypting data: \(error)")
            return nil
        }
    }

    // Decrypt data using the private key
    func decryptData(ciphertext: Data, privateKey: Data) -> (message: Data, sharedSecret: Data)? {
        do {
            let decryptionResult = try Kyber.decrypt(privateKey: privateKey, ciphertext: ciphertext)
            return (decryptionResult.message, decrypti
