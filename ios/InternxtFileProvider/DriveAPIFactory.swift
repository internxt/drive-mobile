import Foundation
import InternxtSwiftCore

enum DriveAPIFactory {
  static func make() -> DriveAPI? {
    guard let authToken = sharedString(SharedAuthKeychain.photosTokenKey),
          let baseUrl = sharedString(SharedAuthKeychain.driveBaseUrlKey) else {
      return nil
    }

    return DriveAPI(
      baseUrl: baseUrl,
      authToken: authToken,
      clientName: clientName,
      clientVersion: clientVersion
    )
  }

  private static func sharedString(_ key: String) -> String? {
    guard let data = SharedAuthKeychain.read(key) else { return nil }
    let value = String(decoding: data, as: UTF8.self)
    return value.isEmpty ? nil : value
  }

  private static var clientName: String {
    bundleString("CFBundleName") ?? "drive-mobile"
  }

  private static var clientVersion: String {
    bundleString("CFBundleShortVersionString") ?? "0.0.0"
  }

  private static func bundleString(_ key: String) -> String? {
    Bundle(for: FileProviderExtension.self).object(forInfoDictionaryKey: key) as? String
  }
}
