import Foundation
import Security

/// Single source of truth for the shared Keychain access group used to hand off
/// auth credentials from the host app to the share extension and the File
/// Provider extension. Extracted from `AppDelegate` so the native module and the
/// app-lifecycle sync write to the exact same items.
enum SharedAuthKeychain {
  static let service = "app:no-auth"

  static let photosTokenKey = "shared_photosToken"
  static let mnemonicKey = "shared_mnemonic"
  static let rootFolderIdKey = "shared_rootFolderId"
  static let bucketKey = "shared_bucket"
  static let bridgeUserKey = "shared_bridgeUser"
  static let userIdKey = "shared_userId"
  static let driveBaseUrlKey = "shared_driveBaseUrl"

  static let allKeys = [
    photosTokenKey, mnemonicKey, rootFolderIdKey, bucketKey, bridgeUserKey, userIdKey,
    driveBaseUrlKey,
  ]

  static var accessGroup: String? {
    Bundle.main.object(forInfoDictionaryKey: "SharedKeychainGroup") as? String
  }

  static func read(_ sharedKey: String) -> Data? {
    guard let accessGroup = accessGroup else { return nil }
    var result: AnyObject?
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrGeneric as String: Data(sharedKey.utf8),
      kSecAttrAccount as String: Data(sharedKey.utf8),
      kSecAttrAccessGroup as String: accessGroup,
      kSecMatchLimit as String: kSecMatchLimitOne,
      kSecReturnData as String: true,
    ]
    guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
          let data = result as? Data else { return nil }
    return data
  }

  static func write(_ value: Data, for sharedKey: String) {
    guard let accessGroup = accessGroup else { return }
    delete(sharedKey)
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrGeneric as String: Data(sharedKey.utf8),
      kSecAttrAccount as String: Data(sharedKey.utf8),
      kSecAttrAccessGroup as String: accessGroup,
      // These credentials are read by the File Provider extension in the
      // background with no UI, so a user-authentication gate (SecAccessControl /
      // .userPresence) is intentionally NOT used — it would block every
      // background read. `AfterFirstUnlock` keeps the item readable once the
      // device has been unlocked after boot while still protecting it before
      // first unlock at boot.
      kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock,
      kSecValueData as String: value,
    ]
    SecItemAdd(query as CFDictionary, nil)
  }

  static func write(_ value: String, for sharedKey: String) {
    write(Data(value.utf8), for: sharedKey)
  }

  static func delete(_ sharedKey: String) {
    guard let accessGroup = accessGroup else { return }
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrGeneric as String: Data(sharedKey.utf8),
      kSecAttrAccount as String: Data(sharedKey.utf8),
      kSecAttrAccessGroup as String: accessGroup,
    ]
    SecItemDelete(query as CFDictionary)
  }

  static func clearAll() {
    allKeys.forEach(delete)
  }

  static func readPrivate(_ privateKey: String) -> Data? {
    var result: AnyObject?
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrGeneric as String: Data(privateKey.utf8),
      kSecAttrAccount as String: Data(privateKey.utf8),
      kSecMatchLimit as String: kSecMatchLimitOne,
      kSecReturnData as String: true,
    ]
    guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
          let data = result as? Data else { return nil }
    return data
  }

  static func syncFromPrivateKeychain() {
    guard accessGroup != nil else { return }

    let isAuthenticated = readPrivate("photosToken") != nil
    guard isAuthenticated else {
      clearAll()
      return
    }

    copyFromPrivate(privateKey: "photosToken", sharedKey: photosTokenKey)
    copyFromPrivate(privateKey: "xUser_mnemonic", sharedKey: mnemonicKey, isJSONEncoded: true)
    copyFromPrivate(privateKey: "xUser_rootFolderId", sharedKey: rootFolderIdKey, isJSONEncoded: true)
    copyFromPrivate(privateKey: "xUser_bucket", sharedKey: bucketKey)
    copyFromPrivate(privateKey: "xUser_bridgeUser", sharedKey: bridgeUserKey)
    copyFromPrivate(privateKey: "xUser_userId", sharedKey: userIdKey)
  }

  private static func copyFromPrivate(privateKey: String, sharedKey: String, isJSONEncoded: Bool = false) {
    guard let data = readPrivate(privateKey) else { return }
    write(isJSONEncoded ? jsonDecoded(data) : data, for: sharedKey)
  }

  private static func jsonDecoded(_ data: Data) -> Data {
    guard let object = try? JSONSerialization.jsonObject(with: data, options: [.fragmentsAllowed]) else {
      return data
    }
    if let string = object as? String {
      return Data(string.utf8)
    }
    if let number = object as? NSNumber {
      return Data(number.stringValue.utf8)
    }
    return data
  }
}
