import Foundation
import Photos
import PhotosUI
import React
import UIKit

@objc(PHAssetExport)
class PHAssetExportModule: NSObject {

  @objc static func requiresMainQueueSetup() -> Bool { false }

  @objc func exportAsset(
    _ localIdentifier: String,
    resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    let assets = PHAsset.fetchAssets(withLocalIdentifiers: [localIdentifier], options: nil)
    guard let asset = assets.firstObject else {
      rejecter("NOT_FOUND", "PHAsset not found: \(localIdentifier)", nil)
      return
    }

    let resources = PHAssetResource.assetResources(for: asset)
    guard let resource = resources.first(where: {
      $0.type == .video || $0.type == .fullSizeVideo
    }) ?? resources.first else {
      rejecter("NO_RESOURCE", "No resource found for PHAsset: \(localIdentifier)", nil)
      return
    }

    let ext = (resource.originalFilename as NSString).pathExtension.lowercased()
    let dest = FileManager.default.temporaryDirectory
      .appendingPathComponent("\(UUID().uuidString).\(ext)")

    let options = PHAssetResourceRequestOptions()
    options.isNetworkAccessAllowed = true

    PHAssetResourceManager.default().writeData(for: resource, toFile: dest, options: options) { error in
      if let error = error {
        rejecter("EXPORT_FAILED", error.localizedDescription, error as NSError)
        return
      }
      let size = (try? (FileManager.default.attributesOfItem(atPath: dest.path)[.size] as? NSNumber)?.int64Value) ?? 0
      resolver([
        "uri": dest.absoluteString,
        "size": size,
        "fileName": resource.originalFilename,
      ])
    }
  }
}

@objc(PhotoPicker)
class PhotoPickerModule: NSObject {

  @objc static func requiresMainQueueSetup() -> Bool { true }

  private var activeDelegate: PhotoPickerDelegate?

  @objc func pickAssets(
    _ options: NSDictionary,
    resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    let selectionLimit = (options["selectionLimit"] as? Int) ?? 0

    DispatchQueue.main.async {
      guard let presenter = PhotoPickerModule.topMostViewController() else {
        rejecter("NO_PRESENTER", "No view controller available to present the photo picker", nil)
        return
      }

      var configuration = PHPickerConfiguration(photoLibrary: .shared())
      configuration.selectionLimit = selectionLimit
      configuration.filter = .any(of: [.images, .videos])

      let picker = PHPickerViewController(configuration: configuration)
      let delegate = PhotoPickerDelegate(resolver: resolver) { [weak self] in
        self?.activeDelegate = nil
      }
      picker.delegate = delegate
      self.activeDelegate = delegate

      presenter.present(picker, animated: true)
    }
  }

  private static func topMostViewController() -> UIViewController? {
    let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
    let activeScene = scenes.first { $0.activationState == .foregroundActive } ?? scenes.first

    guard let rootViewController = activeScene?.windows.first(where: { $0.isKeyWindow })?.rootViewController
      ?? activeScene?.windows.first?.rootViewController else {
      return nil
    }

    var topViewController = rootViewController
    while let presented = topViewController.presentedViewController {
      topViewController = presented
    }
    return topViewController
  }
}

private final class PhotoPickerDelegate: NSObject, PHPickerViewControllerDelegate {
  private var resolver: RCTPromiseResolveBlock?
  private let onFinish: () -> Void

  init(resolver: @escaping RCTPromiseResolveBlock, onFinish: @escaping () -> Void) {
    self.resolver = resolver
    self.onFinish = onFinish
  }

  func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
    picker.dismiss(animated: true)

    guard let resolve = resolver else { return }
    resolver = nil

    let identifiers = results.compactMap { $0.assetIdentifier }.map { ["localIdentifier": $0] }
    resolve(identifiers)
    onFinish()
  }
}
