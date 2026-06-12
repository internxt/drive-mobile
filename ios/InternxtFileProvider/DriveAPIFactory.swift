import Foundation
import InternxtSwiftCore

enum DriveAPIFactory {
  static func make() -> DriveAPI? {
    guard let authToken = SharedKeychainCredentials.string(SharedAuthKeychain.photosTokenKey),
          let baseUrl = SharedKeychainCredentials.string(SharedAuthKeychain.driveBaseUrlKey) else {
      return nil
    }

    return DriveAPI(
      baseUrl: baseUrl,
      authToken: authToken,
      clientName: SharedKeychainCredentials.clientName,
      clientVersion: SharedKeychainCredentials.clientVersion
    )
  }
}
