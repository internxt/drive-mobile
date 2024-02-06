//
//  KyberTest.swift
//  Internxt
//
func exampleUsage() {
    let kyber = KyberCrypto()

    // Generate a public-private key pair
    guard let (publicKey, privateKey) = kyber.generateKeyPair() else {
        print("Error generating the key pair.")
        return
    }

    print("Public Key: \(publicKey.base64EncodedString())")
    print("Private Key: \(privateKey.base64EncodedString())")

    // Message to encrypt
    let message = "This is a secret message".data(using: .utf8)!

    // Encrypt the message using the public key
    guard let (ciphertext, sharedSecretEnc) = kyber.encryptData(data: message, publicKey: publicKey) else {
        print("Error encrypting the message.")
        return
    }

    print("Ciphertext: \(ciphertext.base64EncodedString())")
    print("Shared Secret (encryption): \(sharedSecretEnc.base64EncodedString())")

    // Decrypt the message using the private key
    guard let (decryptedMessage, sharedSecretDec) = kyber.decryptData(ciphertext: ciphertext, privateKey: privateKey) else {
        print("Error decrypting the message.")
        return
    }

    print("Decrypted Message: \(String(data: decryptedMessage, encoding: .utf8)!)")
    print("Shared Secret (decryption): \(sharedSecretDec.base64EncodedString())")
}
