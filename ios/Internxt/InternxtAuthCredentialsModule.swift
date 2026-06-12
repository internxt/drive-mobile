import Foundation
import React

/// Bridges the RN auth lifecycle to iOS. On login the host app writes the auth
/// credentials into the shared Keychain (read by the File Provider extension) and
/// registers the File Provider domain; on logout it clears them and removes the
/// domain. iOS counterpart of the Android `InternxtAuthCredentialsModule`
/// (`setCredentials` + `notifyChange(roots)` / `clearCredentials` + `notifyChange(roots)`).
@objc(InternxtAuthCredentialsModule)
class InternxtAuthCredentialsModule: NSObject {

  @objc static func requiresMainQueueSetup() -> Bool { false }

  @objc func setCredentials(
    _ creds: NSDictionary,
    resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    writeSharedCredentials(creds)
    guard #available(iOS 16.0, *) else {
      resolver(nil)
      return
    }
    FileProviderDomainManager.registerDomain { error in
      if let error = error {
        rejecter("E_REGISTER_DOMAIN", error.localizedDescription, error as NSError)
        return
      }
      FileProviderDomainManager.signalEnumeration { signalError in
        if let signalError = signalError {
          NSLog("InternxtAuthCredentialsModule: signalEnumeration failed (ignored): \(signalError.localizedDescription)")
        }
        resolver(nil)
      }
    }
  }

  @objc func clearCredentials(
    _ resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 16.0, *) else {
      SharedAuthKeychain.clearAll()
      resolver(nil)
      return
    }

    FileProviderDomainManager.unregisterDomain { error in
      SharedAuthKeychain.clearAll()
      if let error = error {
        rejecter("E_UNREGISTER_DOMAIN", error.localizedDescription, error as NSError)
        return
      }
      resolver(nil)
    }
  }

  private func writeSharedCredentials(_ creds: NSDictionary) {
    writeIfPresent(creds["bearerToken"], to: SharedAuthKeychain.photosTokenKey)
    writeIfPresent(creds["mnemonic"], to: SharedAuthKeychain.mnemonicKey)
    writeIfPresent(creds["rootFolderUuid"], to: SharedAuthKeychain.rootFolderIdKey)
    writeIfPresent(creds["bridgeUser"], to: SharedAuthKeychain.bridgeUserKey)
    writeIfPresent(creds["userId"], to: SharedAuthKeychain.userIdKey)
    writeIfPresent(creds["driveBaseUrl"], to: SharedAuthKeychain.driveBaseUrlKey)
    writeIfPresent(creds["bridgeBaseUrl"], to: SharedAuthKeychain.bridgeBaseUrlKey)
  }

  private func writeIfPresent(_ value: Any?, to sharedKey: String) {
    guard let value = value as? String, !value.isEmpty else { return }
    SharedAuthKeychain.write(value, for: sharedKey)
  }
}
