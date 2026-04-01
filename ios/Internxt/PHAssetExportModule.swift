import Foundation
import Photos

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
