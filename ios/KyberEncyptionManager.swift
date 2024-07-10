//
//  KyberEncyptionManager.swift
//  Internxt
//
//

class KyberEncryptionManager {
    static func encryptMessage(_ message: Data, with publicKey: Data) throws -> (ciphertext: Data, sharedSecret: Data) {
        return try Kyber.encrypt(publicKey: publicKey, message: message)
    }

    static func decryptCiphertext(_ ciphertext: Data, with privateKey: Data) throws -> (message: Data, sharedSecret: Data) {
        return try Kyber.decrypt(privateKey: privateKey, ciphertext: ciphertext)
    }
}
