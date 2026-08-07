import Foundation
import Photos
import React

@objc(PHBurstExport)
class PHBurstExportModule: NSObject {

  @objc static func requiresMainQueueSetup() -> Bool { false }

  /// Returns which localIdentifiers from the given batch are burst representatives.
  /// Called once per scanner page so the burst detection costs one native call per batch.
  @objc func getBurstRepresentativeIds(
    _ localIds: [String],
    resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    let options = PHFetchOptions()
    options.includeAllBurstAssets = true
    options.includeHiddenAssets = true
    let result = PHAsset.fetchAssets(withLocalIdentifiers: localIds, options: options)

    var representativeIds: [String] = []
    result.enumerateObjects { asset, _, _ in
      NSLog("[PHBurstExport] getBurstRepresentativeIds — asset=%@ representsBurst=%@", asset.localIdentifier, asset.representsBurst ? "true" : "false")
      if asset.representsBurst {
        representativeIds.append(asset.localIdentifier)
      }
    }
    NSLog("[PHBurstExport] getBurstRepresentativeIds — found %lu representatives out of %lu input ids", representativeIds.count, localIds.count)
    resolver(representativeIds)
  }

  /// Exports all non-representative members of a burst as raw resource bytes.
  /// Uses `PHAssetResourceManager` to preserve the original MakerApple maker-note (BurstUUID key 11)
  /// so that `saveBurst(_:)` can reconstruct the burst group in the photo library.
  @objc func exportBurstMembers(
    _ representativeId: String,
    resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    let fetchOptions = PHFetchOptions()
    fetchOptions.includeAllBurstAssets = true
    fetchOptions.includeHiddenAssets = true

    let representativeFetch = PHAsset.fetchAssets(
      withLocalIdentifiers: [representativeId],
      options: fetchOptions
    )
    guard let representative = representativeFetch.firstObject else {
      rejecter("NOT_FOUND", "PHAsset not found: \(representativeId)", nil)
      return
    }

    NSLog("[PHBurstExport] representsBurst=%@ burstId=%@ subtypes=%lu",
          representative.representsBurst ? "true" : "false",
          representative.burstIdentifier ?? "nil",
          representative.mediaSubtypes.rawValue)

    guard let burstId = representative.burstIdentifier else {
      NSLog("[PHBurstExport] burstIdentifier is nil — not a burst")
      resolver(["members": []])
      return
    }

    // fetchAssets(withBurstIdentifier:) ignores includeAllBurstAssets on some iOS versions —
    // use a general predicate fetch instead so all hidden members are included.
    let burstOptions = PHFetchOptions()
    burstOptions.includeAllBurstAssets = true
    burstOptions.includeHiddenAssets = true
    burstOptions.predicate = NSPredicate(format: "burstIdentifier == %@", burstId)

    let burstAssets = PHAsset.fetchAssets(with: .image, options: burstOptions)
    NSLog("[PHBurstExport] predicate fetch for burstId=%@ returned %lu assets", burstId, burstAssets.count)

    var members: [PHAsset] = []
    burstAssets.enumerateObjects { asset, _, _ in
      NSLog("[PHBurstExport]   asset=%@ representsBurst=%@", asset.localIdentifier, asset.representsBurst ? "true" : "false")
      if asset.localIdentifier != representativeId {
        members.append(asset)
      }
    }

    NSLog("[PHBurstExport] members after excluding representative: %lu", members.count)

    if members.isEmpty {
      resolver(["members": []])
      return
    }

    let resourceRequestOptions = PHAssetResourceRequestOptions()
    resourceRequestOptions.isNetworkAccessAllowed = true

    var exportedMembers: [[String: Any]] = []
    var exportErrors: [Error] = []
    let group = DispatchGroup()

    for member in members {
      let resources = PHAssetResource.assetResources(for: member)
      guard let resource = resources.first(where: { $0.type == .photo })
              ?? resources.first(where: { $0.type == .fullSizePhoto })
              ?? resources.first else {
        continue
      }

      let ext = (resource.originalFilename as NSString).pathExtension.lowercased().isEmpty
        ? "jpg"
        : (resource.originalFilename as NSString).pathExtension.lowercased()
      let dest = FileManager.default.temporaryDirectory
        .appendingPathComponent("\(UUID().uuidString).\(ext)")

      group.enter()
      PHAssetResourceManager.default().writeData(for: resource, toFile: dest, options: resourceRequestOptions) { error in
        defer { group.leave() }
        if let error = error {
          try? FileManager.default.removeItem(at: dest)
          exportErrors.append(error)
          return
        }
        let size = (try? (FileManager.default.attributesOfItem(atPath: dest.path)[.size] as? NSNumber)?.int64Value) ?? 0
        exportedMembers.append([
          "uri": dest.absoluteString,
          "size": size,
          "fileName": resource.originalFilename,
        ])
      }
    }

    group.notify(queue: .global()) {
      if exportedMembers.isEmpty && !exportErrors.isEmpty {
        rejecter("EXPORT_FAILED", exportErrors.first?.localizedDescription ?? "All member exports failed", exportErrors.first as NSError?)
        return
      }
      resolver(["members": exportedMembers])
    }
  }

  /// Saves all burst members (representative first, then non-representatives) to the photo library.
  /// Each file is saved as a raw resource via `PHAssetCreationRequest` so that the original
  /// MakerApple maker-note (BurstUUID key 11) is preserved — iOS uses it to regroup the
  /// members into a burst automatically.
  @objc func saveBurst(
    _ memberPaths: [String],
    resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    guard !memberPaths.isEmpty else {
      resolver(nil)
      return
    }

    var saveErrors: [Error] = []
    let group = DispatchGroup()

    for path in memberPaths {
      let fileURL = URL(fileURLWithPath: path)
      group.enter()
      PHPhotoLibrary.shared().performChanges({
        let request = PHAssetCreationRequest.forAsset()
        let options = PHAssetResourceCreationOptions()
        options.shouldMoveFile = false
        request.addResource(with: .photo, fileURL: fileURL, options: options)
      }) { _, error in
        defer { group.leave() }
        if let error = error {
          saveErrors.append(error)
        }
      }
    }

    group.notify(queue: .global()) {
      if saveErrors.isEmpty {
        resolver(nil)
      } else {
        let msg = saveErrors.map { $0.localizedDescription }.joined(separator: "; ")
        rejecter("SAVE_FAILED", msg, saveErrors.first as NSError?)
      }
    }
  }
}
