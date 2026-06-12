import Foundation

enum SharedKeychainCredentials {
  static func string(_ key: String) -> String? {
    guard let data = SharedAuthKeychain.read(key) else { return nil }
    let value = String(decoding: data, as: UTF8.self)
    return value.isEmpty ? nil : value
  }

  static var clientName: String {
    bundleString("CFBundleName") ?? "drive-mobile"
  }

  static var clientVersion: String {
    bundleString("CFBundleShortVersionString") ?? "0.0.0"
  }

  private static func bundleString(_ key: String) -> String? {
    Bundle(for: FileProviderExtension.self).object(forInfoDictionaryKey: key) as? String
  }
}
