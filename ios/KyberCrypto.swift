class KyberCrypto {
    // Generate a public-private key pair
    func generateAsymmetricKeyPair() -> (publicKey: Data, privateKey: Data)? {
        do {
            let keyPair = try Kyber.generateKeyPair(keySize: keySize)
            return (keyPair.publicKey, keyPair.privateKey)
        } catch {
            print("Error generating asymmetric keys: \(error)")
            return nil
        }
    }

    // Encrypt a message with a public key
    func encryptMessage(_ message: Data, using publicKey: Data) -> (ciphertext: Data, sharedSecret: Data)? {
        do {
            let encryptionResult = try Kyber.encrypt(publicKey: publicKey, message: message)
            return (encryptionResult.ciphertext, encryptionResult.sharedSecret)
        } catch {
            print("Error encrypting message: \(error)")
            return nil
        }
    }

    // Decrypt a ciphertext with a private key
    func decryptCiphertext(_ ciphertext: Data, using privateKey: Data) -> (message: Data, sharedSecret: Data)? {
        do {
            let decryptionResult = try Kyber.decrypt(privateKey: privateKey, ciphertext: ciphertext)
            return (decryptionResult.message, decryptionResult.sharedSecret)
        } catch {
            print("Error decrypting ciphertext: \(error)")
            return nil
        }
    }
}
