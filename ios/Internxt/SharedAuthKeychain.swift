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
  static let bridgeBaseUrlKey = "shared_bridgeBaseUrl"
  static let themePreferenceKey = "shared_themePreference"

  static let allKeys = [
    photosTokenKey, mnemonicKey, rootFolderIdKey, bucketKey, bridgeUserKey, userIdKey,
    driveBaseUrlKey, bridgeBaseUrlKey,
  ]

  static var accessGroup: String? {
    Bundle.main.object(forInfoDictionaryKey: "SharedKeychainGroup") as? String
  }

  static func read(_ sharedKey: String) -> Data? {
    guard let accessGroup = accessGroup else { return nil }
    return copyData(matching: query(for: sharedKey, accessGroup: accessGroup))
  }

  static func write(_ value: Data, for sharedKey: String) {
    guard let accessGroup = accessGroup else { return }
    let existing = read(sharedKey)
    if existing == value { return }

    let query = Self.query(for: sharedKey, accessGroup: accessGroup)
    let attributes: [String: Any] = [
      // These credentials are read by the File Provider extension in the
      // background with no UI, so a user-authentication gate (SecAccessControl /
      // .userPresence) is intentionally NOT used — it would block every
      // background read. `AfterFirstUnlock` keeps the item readable once the
      // device has been unlocked after boot while still protecting it before
      // first unlock at boot.
      kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock,
      kSecValueData as String: value,
    ]

    let updateStatus = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
    if updateStatus == errSecSuccess { return }

    if updateStatus != errSecItemNotFound {
      delete(sharedKey)
    }
    SecItemAdd(query.merging(attributes) { $1 } as CFDictionary, nil)
  }

  static func write(_ value: String, for sharedKey: String) {
    write(Data(value.utf8), for: sharedKey)
  }

  static func delete(_ sharedKey: String) {
    guard let accessGroup = accessGroup else { return }
    SecItemDelete(query(for: sharedKey, accessGroup: accessGroup) as CFDictionary)
  }

  static func clearAll() {
    allKeys.forEach(delete)
  }

  static func readPrivate(_ privateKey: String) -> Data? {
    readPrivateRaw(privateKey) ?? readPrivateChunked(privateKey)
  }

  private static func readPrivateChunked(_ privateKey: String) -> Data? {
    guard let countData = readPrivateRaw("\(privateKey)_chunks"),
          let count = Int(String(decoding: countData, as: UTF8.self)),
          count > 0 else { return nil }
    var joined = Data()
    for index in 0..<count {
      guard let chunk = readPrivateRaw("\(privateKey)_chunk_\(index)") else { return nil }
      joined.append(chunk)
    }
    return joined
  }

  private static func readPrivateRaw(_ privateKey: String) -> Data? {
    copyData(matching: query(for: privateKey))
  }

  private static func query(for key: String, accessGroup: String? = nil) -> [String: Any] {
    var query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrGeneric as String: Data(key.utf8),
      kSecAttrAccount as String: Data(key.utf8),
    ]
    if let accessGroup = accessGroup {
      query[kSecAttrAccessGroup as String] = accessGroup
    }
    return query
  }

  private static func copyData(matching query: [String: Any]) -> Data? {
    var readQuery = query
    readQuery[kSecMatchLimit as String] = kSecMatchLimitOne
    readQuery[kSecReturnData as String] = true
    var result: AnyObject?
    guard SecItemCopyMatching(readQuery as CFDictionary, &result) == errSecSuccess else { return nil }
    return result as? Data
  }

  static func syncFromPrivateKeychain() {
    guard accessGroup != nil else { return }

    syncThemePreference()

    let isAuthenticated = readPrivate("photosToken") != nil
    guard isAuthenticated else { return }

    copyFromPrivate(privateKey: "photosToken", sharedKey: photosTokenKey)
    copyFromPrivate(privateKey: "xUser_mnemonic", sharedKey: mnemonicKey, isJSONEncoded: true)
    copyFromPrivate(privateKey: "xUser_rootFolderId", sharedKey: rootFolderIdKey, isJSONEncoded: true)
    copyFromPrivate(privateKey: "xUser_bucket", sharedKey: bucketKey)
    copyFromPrivate(privateKey: "xUser_bridgeUser", sharedKey: bridgeUserKey, isJSONEncoded: true)
    copyFromPrivate(privateKey: "xUser_userId", sharedKey: userIdKey, isJSONEncoded: true)
  }

  static func syncThemePreference() {
    guard accessGroup != nil else { return }
    if let data = readPrivate("themePreference") {
      write(data, for: themePreferenceKey)
    } else {
      delete(themePreferenceKey)
    }
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
