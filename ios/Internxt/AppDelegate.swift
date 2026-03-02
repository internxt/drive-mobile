import Expo
import React
import ReactAppDependencyProvider
import Security

@UIApplicationMain
public class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory
    bindReactNativeFactory(factory)

#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

    syncAuthStatusToAppGroup()
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // Sync auth status whenever the app moves to background so the share
  // extension always reads an up-to-date value from the shared UserDefaults.
  public override func applicationDidEnterBackground(_ application: UIApplication) {
    syncAuthStatusToAppGroup()
    super.applicationDidEnterBackground(application)
  }

  // MARK: - App Group auth sync

  private func syncAuthStatusToAppGroup() {
    guard let appGroup = Bundle.main.object(forInfoDictionaryKey: "AppGroup") as? String,
          let defaults = UserDefaults(suiteName: appGroup),
          let sharedGroup = Bundle.main.object(forInfoDictionaryKey: "SharedKeychainGroup") as? String
    else { return }

    let isAuthenticated = privateKeychainItemExists(key: "photosToken")
    defaults.set(isAuthenticated, forKey: "isAuthenticated")

    if isAuthenticated {
      copyToSharedKeychain(privateKey: "photosToken", sharedKey: "shared_photosToken", accessGroup: sharedGroup)
      copyToSharedKeychain(privateKey: "xUser_mnemonic", sharedKey: "shared_mnemonic", accessGroup: sharedGroup)
      defaults.set(readEmailFromKeychain(), forKey: "userEmail")
    } else {
      deleteFromSharedKeychain(key: "shared_photosToken", accessGroup: sharedGroup)
      deleteFromSharedKeychain(key: "shared_mnemonic", accessGroup: sharedGroup)
      defaults.removeObject(forKey: "userEmail")
    }
  }

  private func readEmailFromKeychain() -> String? {
    guard let data = readFromPrivateKeychain(key: "xUser_data"),
          var raw = String(data: data, encoding: .utf8) else { return nil }
    if raw.hasPrefix("\"") && raw.hasSuffix("\"") {
      raw = String(raw.dropFirst().dropLast())
    }
    guard let jsonData = raw.data(using: .utf8),
          let json = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any],
          let email = json["email"] as? String else { return nil }
    return email
  }

  private func privateKeychainItemExists(key: String) -> Bool {
    return readFromPrivateKeychain(key: key) != nil
  }

  private func copyToSharedKeychain(privateKey: String, sharedKey: String, accessGroup: String) {
    guard let data = readFromPrivateKeychain(key: privateKey) else { return }
    writeToSharedKeychain(data: data, key: sharedKey, accessGroup: accessGroup)
  }

  private func readFromPrivateKeychain(key: String) -> Data? {
    var result: AnyObject?
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: "app:no-auth",
      kSecAttrGeneric as String: Data(key.utf8),
      kSecAttrAccount as String: Data(key.utf8),
      kSecMatchLimit as String: kSecMatchLimitOne,
      kSecReturnData as String: true,
    ]
    guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
          let data = result as? Data else { return nil }
    return data
  }

  private func writeToSharedKeychain(data: Data, key: String, accessGroup: String) {
    deleteFromSharedKeychain(key: key, accessGroup: accessGroup)
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: "app:no-auth",
      kSecAttrGeneric as String: Data(key.utf8),
      kSecAttrAccount as String: Data(key.utf8),
      kSecAttrAccessGroup as String: accessGroup,
      kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock,
      kSecValueData as String: data,
    ]
    SecItemAdd(query as CFDictionary, nil)
  }

  private func deleteFromSharedKeychain(key: String, accessGroup: String) {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: "app:no-auth",
      kSecAttrGeneric as String: Data(key.utf8),
      kSecAttrAccount as String: Data(key.utf8),
      kSecAttrAccessGroup as String: accessGroup,
    ]
    SecItemDelete(query as CFDictionary)
  }

  // Linking API
  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)
  }

  // Universal Links
  public override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
    return super.application(application, continue: userActivity, restorationHandler: restorationHandler) || result
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  // Extension point for config-plugins

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // needed to return the correct URL for expo-dev-client.
    bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
