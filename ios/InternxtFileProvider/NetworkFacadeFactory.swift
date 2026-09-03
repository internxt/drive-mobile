import Foundation
import CryptoKit
import InternxtSwiftCore

enum NetworkFacadeFactory {
  static func make() -> NetworkFacade? {
    guard let mnemonic = SharedKeychainCredentials.string(SharedAuthKeychain.mnemonicKey) else {
      return nil
    }
    guard let bridgeBaseUrl = SharedKeychainCredentials.string(SharedAuthKeychain.bridgeBaseUrlKey) else {
      return nil
    }
    guard let bridgeUser = SharedKeychainCredentials.string(SharedAuthKeychain.bridgeUserKey) else {
      return nil
    }
    guard let userId = SharedKeychainCredentials.string(SharedAuthKeychain.userIdKey) else {
      return nil
    }

    let bridgePass = deriveBridgePass(userId: userId)
    let basicAuthToken = Data("\(bridgeUser):\(bridgePass)".utf8).base64EncodedString()
    let networkAPI = NetworkAPI(
      baseUrl: bridgeBaseUrl,
      basicAuthToken: basicAuthToken,
      clientName: SharedKeychainCredentials.clientName,
      clientVersion: SharedKeychainCredentials.clientVersion
    )
    return NetworkFacade(mnemonic: mnemonic, networkAPI: networkAPI)
  }

  private static func deriveBridgePass(userId: String) -> String {
    let digest = SHA256.hash(data: Data(userId.utf8))
    return digest.map { String(format: "%02x", $0) }.joined()
  }
}
