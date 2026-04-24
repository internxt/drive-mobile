// ─── From expo-share-extension library ───────────────────────────────────────
import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import AVFoundation
import UniformTypeIdentifiers
import Photos

// ─── Internxt additions ───────────────────────────────────────────────────────
import Security

#if canImport(FirebaseCore)
import FirebaseCore
#endif
#if canImport(FirebaseAuth)
import FirebaseAuth
#endif
// ─────────────────────────────────────────────────────────────────────────────

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for _: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    let settings = RCTBundleURLProvider.sharedSettings()
    settings.enableDev = true
    settings.enableMinification = false
    if let bundleURL = settings.jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry") {
      if var components = URLComponents(url: bundleURL, resolvingAgainstBaseURL: false) {
        components.queryItems = (components.queryItems ?? []) + [URLQueryItem(name: "shareExtension", value: "true")]
        return components.url ?? bundleURL
      }
      return bundleURL
    }
    fatalError("Could not create bundle URL")
#else
    guard let bundleURL = Bundle.main.url(forResource: "main", withExtension: "jsbundle") else {
      fatalError("Could not load bundle URL")
    }
    return bundleURL
#endif
  }
}

class ShareExtensionViewController: UIViewController {
  private let loadingIndicator = UIActivityIndicatorView(style: .large)
  var reactNativeFactory: RCTReactNativeFactory?
  var reactNativeFactoryDelegate: RCTReactNativeFactoryDelegate?
  private var isCleanedUp = false

  // ── Internxt: threshold for handoff to main app ────────────────────────────
  private let iosHandoffThreshold: Int64 = 300 * 1024 * 1024

  private struct CollectedItem {
    let url: URL
    let name: String
    let category: String       // "files", "images", "videos"
    let phAssetId: String?     // PHAsset localIdentifier — nil for non-Photos items
  }
  // ──────────────────────────────────────────────────────────────────────────

  deinit {
    cleanupAfterClose()
  }

  override func viewWillDisappear(_ animated: Bool) {
    super.viewWillDisappear(animated)
    if isBeingDismissed {
      cleanupAfterClose()
    }
  }

  override func viewDidLoad() {
    super.viewDidLoad()
    setupLoadingIndicator()
    isCleanedUp = false
    self.view.backgroundColor = .clear
    self.view.contentScaleFactor = UIScreen.main.scale

#if canImport(FirebaseCore)
    if Bundle.main.object(forInfoDictionaryKey: "WithFirebase") as? Bool ?? false {
      FirebaseApp.configure()
    }
#endif

    loadReactNativeContent()
    setupNotificationCenterObserver()
  }

  override func viewDidDisappear(_ animated: Bool) {
    super.viewDidDisappear(animated)
    cleanupAfterClose()
  }

  func close() {
    self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
    cleanupAfterClose()
  }

  private func loadReactNativeContent() {
    getShareData { [weak self] sharedData in
      guard let self = self else { return }

      // ── From expo-share-extension library ──────────────────────────────────
      reactNativeFactoryDelegate = ReactNativeDelegate()
      reactNativeFactoryDelegate!.dependencyProvider = RCTAppDependencyProvider()
      reactNativeFactory = RCTReactNativeFactory(delegate: reactNativeFactoryDelegate!)

      var initialProps = sharedData ?? [:]
      // ── Internxt: inject auth state from Keychain ───────────────────────────
      if let sharedGroup = Bundle.main.object(forInfoDictionaryKey: "SharedKeychainGroup") as? String {
        initialProps["photosToken"]   = readFromSharedKeychain(key: "shared_photosToken", accessGroup: sharedGroup)
        initialProps["mnemonic"]      = readFromSharedKeychainStripped(key: "shared_mnemonic",      accessGroup: sharedGroup)
        initialProps["rootFolderId"]  = readFromSharedKeychainStripped(key: "shared_rootFolderId",  accessGroup: sharedGroup)
        initialProps["bucket"]        = readFromSharedKeychainStripped(key: "shared_bucket",        accessGroup: sharedGroup)
        initialProps["bridgeUser"]    = readFromSharedKeychainStripped(key: "shared_bridgeUser",    accessGroup: sharedGroup)
        initialProps["userId"]        = readFromSharedKeychainStripped(key: "shared_userId",        accessGroup: sharedGroup)
        initialProps["themePreference"] = readFromSharedKeychainStripped(key: "shared_themePreference", accessGroup: sharedGroup)
      }
      // ── From expo-share-extension library ──────────────────────────────────
      let currentBounds = self.view.bounds
      initialProps["initialViewWidth"] = currentBounds.width
      initialProps["initialViewHeight"] = currentBounds.height
      initialProps["pixelRatio"] = UIScreen.main.scale
      initialProps["fontScale"] = UIFont.preferredFont(forTextStyle: .body).pointSize / 17.0

      let reactNativeRootView = reactNativeFactory!.rootViewFactory.view(
          withModuleName: "shareExtension",
          initialProperties: initialProps
      )

      let backgroundFromInfoPlist = Bundle.main.object(forInfoDictionaryKey: "ShareExtensionBackgroundColor") as? [String: CGFloat]
      let heightFromInfoPlist = Bundle.main.object(forInfoDictionaryKey: "ShareExtensionHeight") as? CGFloat

      configureRootView(reactNativeRootView, withBackgroundColorDict: backgroundFromInfoPlist, withHeight: heightFromInfoPlist)
      view.addSubview(reactNativeRootView)

      self.loadingIndicator.stopAnimating()
      self.loadingIndicator.removeFromSuperview()
      // ───────────────────────────────────────────────────────────────────────
    }
  }

  private func configureRootView(_ rootView: UIView, withBackgroundColorDict dict: [String: CGFloat]?, withHeight: CGFloat?) {
    rootView.backgroundColor = backgroundColor(from: dict)

    let screenBounds = UIScreen.main.bounds
    let frame: CGRect
    if let withHeight = withHeight {
      rootView.autoresizingMask = [.flexibleWidth, .flexibleTopMargin]
      frame = CGRect(
        x: 0,
        y: screenBounds.height - withHeight,
        width: screenBounds.width,
        height: withHeight
      )
    } else {
      rootView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
      frame = screenBounds
    }
    rootView.frame = frame
  }

  private func setupLoadingIndicator() {
    view.addSubview(loadingIndicator)
    loadingIndicator.translatesAutoresizingMaskIntoConstraints = false
    NSLayoutConstraint.activate([
      loadingIndicator.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      loadingIndicator.centerYAnchor.constraint(equalTo: view.centerYAnchor)
    ])
    loadingIndicator.startAnimating()
  }

  private func openHostApp(path: String?) {
    guard let scheme = Bundle.main.object(forInfoDictionaryKey: "HostAppScheme") as? String else { return }
    var urlComponents = URLComponents()
    urlComponents.scheme = scheme
    urlComponents.host = ""

    if let path = path {
      let pathComponents = path.split(separator: "?", maxSplits: 1)
      let pathWithoutQuery = String(pathComponents[0])
      let queryString = pathComponents.count > 1 ? String(pathComponents[1]) : nil

      if let queryString = queryString {
        let queryItems = queryString.split(separator: "&").map { queryParam -> URLQueryItem in
          let paramComponents = queryParam.split(separator: "=", maxSplits: 1)
          let name = String(paramComponents[0])
          let value = paramComponents.count > 1 ? String(paramComponents[1]) : nil
          return URLQueryItem(name: name, value: value)
        }
        urlComponents.queryItems = queryItems
      }

      var baseComponents = URLComponents()
      baseComponents.scheme = scheme
      baseComponents.host = ""
      let strippedPath = pathWithoutQuery.hasPrefix("/") ? String(pathWithoutQuery.dropFirst()) : pathWithoutQuery
      if let baseURL = baseComponents.url {
        urlComponents.path = baseURL.appendingPathComponent(strippedPath).path
      }
    }

    guard let url = urlComponents.url else { return }
    openURL(url)
    self.close()
  }

  @objc @discardableResult private func openURL(_ url: URL) -> Bool {
    // Method 1: Try responder chain to find UIApplication
    var responder: UIResponder? = self
    while responder != nil {
      if let application = responder as? UIApplication {
        application.open(url, options: [:], completionHandler: nil)
        return true
      }
      responder = responder?.next
    }

    // Method 2: Selector-based fallback
    let selector = NSSelectorFromString("openURL:")
    var responder2: UIResponder? = self
    while responder2 != nil {
      if responder2!.responds(to: selector) {
        responder2!.perform(selector, with: url)
        return true
      }
      responder2 = responder2?.next
    }

    return false
  }

  private func setupNotificationCenterObserver() {
    NotificationCenter.default.addObserver(forName: NSNotification.Name("close"), object: nil, queue: nil) { [weak self] _ in
      DispatchQueue.main.async {
        self?.close()
      }
    }

    NotificationCenter.default.addObserver(forName: NSNotification.Name("openHostApp"), object: nil, queue: nil) { [weak self] notification in
      DispatchQueue.main.async {
        if let userInfo = notification.userInfo, let path = userInfo["path"] as? String {
          self?.openHostApp(path: path)
        }
      }
    }
  }

  private func cleanupAfterClose() {
    if isCleanedUp { return }
    isCleanedUp = true

    NotificationCenter.default.removeObserver(self)

    view.subviews.forEach { subview in
      if subview is RCTRootView {
        subview.removeFromSuperview()
      }
    }

    reactNativeFactory = nil
    reactNativeFactoryDelegate = nil
  }

  // ── Internxt: read a value from the shared Keychain access group ────────────
  private func readFromSharedKeychain(key: String, accessGroup: String) -> String? {
    var result: AnyObject?
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: "app:no-auth",
      kSecAttrGeneric as String: Data(key.utf8),
      kSecAttrAccount as String: Data(key.utf8),
      kSecAttrAccessGroup as String: accessGroup,
      kSecMatchLimit as String: kSecMatchLimitOne,
      kSecReturnData as String: true,
    ]
    guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
          let data = result as? Data,
          let value = String(data: data, encoding: .utf8) else { return nil }
    return value
  }

  /// Reads a shared-keychain entry and strips surrounding JSON quotes if present.
  private func readFromSharedKeychainStripped(key: String, accessGroup: String) -> String? {
    guard let raw = readFromSharedKeychain(key: key, accessGroup: accessGroup) else { return nil }
    if raw.hasPrefix("\"") && raw.hasSuffix("\"") {
      return String(raw.dropFirst().dropLast())
    }
    return raw
  }
  // ─────────────────────────────────────────────────────────────────────────

  // ── From expo-share-extension library ─────────────────────────────────────
  private func backgroundColor(from dict: [String: CGFloat]?) -> UIColor {
    guard let dict = dict else { return .systemBackground }
    let red = dict["red"] ?? 255.0
    let green = dict["green"] ?? 255.0
    let blue = dict["blue"] ?? 255.0
    let alpha = dict["alpha"] ?? 1
    return UIColor(red: red / 255.0, green: green / 255.0, blue: blue / 255.0, alpha: alpha)
  }

  // ─── Internxt: Two-phase getShareData with large file handoff ─────────────
  //
  // PHASE 1: Collect all items without copying to the App Group
  // PHASE 2 (group.notify): Calculate totalSize → decide normal upload vs handoff
  //
  // If totalSize > iosHandoffThreshold:
  //   • Photos assets → phAssetId only in JSON (no file copy, 0 bytes written)
  //   • Files.app / iCloud Drive → moveItem to App Group, dest URI in JSON
  //   • Do NOT call completion → React Native must never start on handoff
  //
  // If totalSize ≤ iosHandoffThreshold:
  //   • copyItem to App Group → completion(sharedItems) → React Native normal upload
  // ──────────────────────────────────────────────────────────────────────────
  private func getShareData(completion: @escaping ([String: Any]?) -> Void) {
    guard let extensionItems = extensionContext?.inputItems as? [NSExtensionItem] else {
      completion(nil)
      return
    }

    // Flatten all providers with a global index
    var allProviders: [NSItemProvider] = []
    for item in extensionItems {
      allProviders.append(contentsOf: item.attachments ?? [])
    }

    // Resultados por índice de provider
    var resultURLs:          [Int: URL]    = [:]
    var resultNames:         [Int: String] = [:]
    var resultCategories:    [Int: String] = [:]
    var resultPhAssetIds:    [Int: String] = [:]

    var preprocessingResults: NSDictionary? = nil
    var sharedURL: String? = nil
    var sharedText: String? = nil

    let lock = NSLock()
    let group = DispatchGroup()
    let fileManager = FileManager.default
    let tempDir = fileManager.temporaryDirectory

    for (idx, provider) in allProviders.enumerated() {

      // ── PHAsset (Photos) — loads concurrently with the URL, captures localIdentifier ──
      // NSClassFromString avoids the Swift generic overload that requires _ObjectiveCBridgeable.
      // Casting to NSItemProviderReading.Type uses the non-generic ObjC overload of canLoadObject/loadObject.
      if let phAssetClass = NSClassFromString("PHAsset") as? NSItemProviderReading.Type,
         provider.canLoadObject(ofClass: phAssetClass) {
        group.enter()
        provider.loadObject(ofClass: phAssetClass) { (obj, _) in
          DispatchQueue.main.async {
            defer { group.leave() }
            guard let asset = obj as? PHAsset else { return }
            let resources = PHAssetResource.assetResources(for: asset)
            let originalName = resources.first(where: {
              $0.type == .video || $0.type == .fullSizeVideo
            })?.originalFilename ?? resources.first?.originalFilename
            lock.lock()
            resultPhAssetIds[idx] = asset.localIdentifier
            if let name = originalName {
              resultNames[idx] = name   // nombre original del asset (IMG_3290.MOV)
            }
            lock.unlock()
          }
        }
      }

      // ── public.url — Files.app, iCloud Drive, screenshots ──
      if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
        group.enter()
        provider.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { (urlItem, _) in
          DispatchQueue.main.async {
            defer { group.leave() }
            if let url = urlItem as? URL {
              if url.isFileURL {
                let ext = url.pathExtension.lowercased()
                let imageExtensions = ["jpg", "jpeg", "png", "gif", "bmp", "tiff", "tif", "heic", "heif", "webp"]
                var isImage = imageExtensions.contains(ext)
                if !isImage, let resourceValues = try? url.resourceValues(forKeys: [.typeIdentifierKey]),
                   let typeIdentifier = resourceValues.typeIdentifier {
                  isImage = UTType(typeIdentifier)?.conforms(to: .image) ?? false
                }
                lock.lock()
                resultURLs[idx] = url
                // Only set name if PHAsset has not already set the original filename
                if resultNames[idx] == nil { resultNames[idx] = url.lastPathComponent }
                resultCategories[idx] = isImage ? "images" : "files"
                lock.unlock()
              } else {
                lock.lock()
                sharedURL = url.absoluteString
                lock.unlock()
              }
            }
          }
        }
      }

      // ── propertyList — Safari preprocessing ──
      if provider.hasItemConformingToTypeIdentifier(UTType.propertyList.identifier) {
        group.enter()
        provider.loadItem(forTypeIdentifier: UTType.propertyList.identifier, options: nil) { (item, _) in
          DispatchQueue.main.async {
            defer { group.leave() }
            if let itemDict = item as? NSDictionary,
               let results = itemDict[NSExtensionJavaScriptPreprocessingResultsKey] as? NSDictionary {
              lock.lock()
              preprocessingResults = results
              lock.unlock()
            }
          }
        }
      }

      // ── text — if there are no URL ──
      if !provider.hasItemConformingToTypeIdentifier(UTType.url.identifier)
          && provider.hasItemConformingToTypeIdentifier(UTType.text.identifier) {
        group.enter()
        provider.loadItem(forTypeIdentifier: UTType.text.identifier, options: nil) { (textItem, _) in
          DispatchQueue.main.async {
            defer { group.leave() }
            if let text = textItem as? String {
              lock.lock()
              sharedText = text
              lock.unlock()
            }
          }
        }
      } else if provider.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
        // ── image — only if there is no URL (avoids duplicating Photos items via url+image) ──
        group.enter()
        provider.loadItem(forTypeIdentifier: UTType.image.identifier, options: nil) { (imageItem, _) in
          DispatchQueue.main.async {
            defer { group.leave() }
            let name = UUID().uuidString
            if let imageURL = imageItem as? NSURL, let path = imageURL.path {
              let ext = imageURL.pathExtension ?? "jpg"
              lock.lock()
              resultURLs[idx] = URL(fileURLWithPath: path)
              if resultNames[idx] == nil { resultNames[idx] = "\(name).\(ext)" }
              resultCategories[idx] = "images"
              lock.unlock()
            } else {
              let rawData: Data?
              if let image = imageItem as? UIImage {
                rawData = image.jpegData(compressionQuality: 1.0)
              } else {
                rawData = imageItem as? Data
              }
              if let data = rawData {
                let dest = tempDir.appendingPathComponent("\(name).jpg")
                try? data.write(to: dest)
                lock.lock()
                resultURLs[idx] = dest
                if resultNames[idx] == nil { resultNames[idx] = "\(name).jpg" }
                resultCategories[idx] = "images"
                lock.unlock()
              }
            }
          }
        }
      } else if provider.hasItemConformingToTypeIdentifier(UTType.movie.identifier) {
        // ── movie — only if there is no URL ──
        group.enter()
        provider.loadItem(forTypeIdentifier: UTType.movie.identifier, options: nil) { (videoItem, _) in
          DispatchQueue.main.async {
            let name = UUID().uuidString
            if let videoURL = videoItem as? NSURL, let path = videoURL.path {
              let ext = videoURL.pathExtension ?? "mov"
              lock.lock()
              resultURLs[idx] = URL(fileURLWithPath: path)
              if resultNames[idx] == nil { resultNames[idx] = "\(name).\(ext)" }
              resultCategories[idx] = "videos"
              lock.unlock()
              group.leave()
            } else if let videoData = videoItem as? NSData {
              let dest = tempDir.appendingPathComponent("\(name).mov")
              try? videoData.write(to: dest)
              lock.lock()
              resultURLs[idx] = dest
              if resultNames[idx] == nil { resultNames[idx] = "\(name).mov" }
              resultCategories[idx] = "videos"
              lock.unlock()
              group.leave()
            } else if let asset = videoItem as? AVAsset {
              let dest = tempDir.appendingPathComponent("\(name).mov")
              let session = AVAssetExportSession(asset: asset, presetName: AVAssetExportPresetPassthrough)
              session?.outputURL = dest
              session?.outputFileType = .mov
              session?.exportAsynchronously {
                if session?.status == .completed {
                  lock.lock()
                  resultURLs[idx] = dest
                  if resultNames[idx] == nil { resultNames[idx] = "\(name).mov" }
                  resultCategories[idx] = "videos"
                  lock.unlock()
                } else {
                  print("[ShareExt] AVAsset export failed: \(String(describing: session?.error))")
                }
                group.leave()
              }
            } else {
              print("[ShareExt] videoItem is not a recognized type")
              group.leave()
            }
          }
        }
      }
    }

    group.notify(queue: .main) {
      // Build collectedItems from the indexed dictionaries
      var collectedItems: [CollectedItem] = []
      for (idx, url) in resultURLs {
        collectedItems.append(CollectedItem(
          url: url,
          name: resultNames[idx] ?? url.lastPathComponent,
          category: resultCategories[idx] ?? "files",
          phAssetId: resultPhAssetIds[idx]
        ))
      }
      // Items with PHAsset only (no public.url): the Photos provider does not always emit a URL.
      // In the normal path they are skipped (no local file to copy); in handoff the assetId is used.
      for (idx, assetId) in resultPhAssetIds where resultURLs[idx] == nil {
        collectedItems.append(CollectedItem(
          url: URL(fileURLWithPath: ""),  // placeholder — sin archivo local
          name: resultNames[idx] ?? assetId,
          category: resultCategories[idx] ?? "videos",
          phAssetId: assetId
        ))
      }

      // Calculate totalSize — [.size] returns NSNumber, not Int64 directly
      let totalSize = collectedItems.reduce(Int64(0)) { sum, item in
        let itemSize = (try? (fileManager.attributesOfItem(atPath: item.url.path)[.size] as? NSNumber)?.int64Value) ?? 0
        return sum + itemSize
      }

      guard let appGroup = Bundle.main.object(forInfoDictionaryKey: "AppGroup") as? String,
            let containerURL = fileManager.containerURL(forSecurityApplicationGroupIdentifier: appGroup)
      else {
        completion(nil)
        return
      }

      let sharedDataURL = containerURL.appendingPathComponent("sharedData")
      if !fileManager.fileExists(atPath: sharedDataURL.path) {
        try? fileManager.createDirectory(at: sharedDataURL, withIntermediateDirectories: true)
      }

      if totalSize > self.iosHandoffThreshold {
        self.handleLargeFileHandoff(
          items: collectedItems,
          containerURL: containerURL,
          sharedDataURL: sharedDataURL
        )
      } else {
        var sharedItems: [String: Any] = [:]

        for item in collectedItems {
          // PHAsset-only items (empty url) are only supported in the handoff path; skip them here
          guard !item.url.path.isEmpty else { continue }
          let dest = sharedDataURL.appendingPathComponent(item.name)
          try? fileManager.removeItem(at: dest)
          try? fileManager.copyItem(at: item.url, to: dest)
          var arr = sharedItems[item.category] as? [String] ?? []
          arr.append(dest.absoluteString)
          sharedItems[item.category] = arr
        }

        if let url = sharedURL { sharedItems["url"] = url }
        if let text = sharedText { sharedItems["text"] = text }
        if let results = preprocessingResults { sharedItems["preprocessingResults"] = results }

        completion(sharedItems.isEmpty ? nil : sharedItems)
      }
    }
  }

  private func handleLargeFileHandoff(items: [CollectedItem],
                                      containerURL: URL,
                                      sharedDataURL: URL) {
    let fileManager = FileManager.default
    var fileEntries: [[String: Any]] = []

    for item in items {
      if let assetId = item.phAssetId {
        // ── Photos item: no file copy, 0 bytes written ──
        // The main app will export the asset via PHAssetResourceManager
        let size = (try? (fileManager.attributesOfItem(atPath: item.url.path)[.size] as? NSNumber)?.int64Value) ?? 0
        fileEntries.append([
          "uri": "",
          "name": item.name,
          "size": size,
          "phAssetId": assetId,
        ])
        print("[Handoff] PHAsset queued (no copy): \(item.name) id=\(assetId)")
      } else {
        // ── Files.app / iCloud Drive item: move or copy to App Group ──
        let dest = sharedDataURL.appendingPathComponent(item.name)
        let finalURL: URL
        try? fileManager.removeItem(at: dest)
        do {
          try fileManager.moveItem(at: item.url, to: dest)
          finalURL = dest
          print("[Handoff] moveItem OK: \(item.name)")
        } catch {
          print("[Handoff] moveItem failed for \(item.name): \(error). Trying copyItem...")
          do {
            try fileManager.copyItem(at: item.url, to: dest)
            finalURL = dest
            print("[Handoff] copyItem OK: \(item.name)")
          } catch {
            print("[Handoff] copyItem also failed, using original URL: \(error)")
            finalURL = item.url
          }
        }
        let size = (try? (fileManager.attributesOfItem(atPath: finalURL.path)[.size] as? NSNumber)?.int64Value) ?? 0
        fileEntries.append([
          "uri": finalURL.absoluteString,
          "name": item.name,
          "size": size,
        ])
      }
    }

    let timestamp = Int64(Date().timeIntervalSince1970 * 1000)
    let metadata: [String: Any] = [
      "files": fileEntries,
      "timestamp": timestamp,
    ]

    do {
      guard let data = try? JSONSerialization.data(withJSONObject: metadata),
            let json = String(data: data, encoding: .utf8) else {
        throw NSError(domain: "Handoff", code: 1,
                      userInfo: [NSLocalizedDescriptionKey: "Failed to serialize handoff metadata"])
      }
      try json.write(
        to: containerURL.appendingPathComponent("pending_share_upload.json"),
        atomically: true,
        encoding: .utf8
      )
    } catch {
      print("[Handoff] ERROR: Failed to write pending_share_upload.json: \(error)")
    }
    openHostApp(path: "handle-large-share")
  }
}
