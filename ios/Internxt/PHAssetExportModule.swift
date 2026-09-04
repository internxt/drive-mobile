import Foundation
import Photos
import React

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

  // Exports both components of a Live Photo (photo + paired video) as raw resource bytes.
  // Using PHAssetResourceManager ensures original byte content (including Apple asset-identifier
  // metadata) is preserved, which is required to reconstruct the Live Photo pair on save.
  @objc func exportLivePhotoComponents(
    _ localIdentifier: String,
    resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    let assets = PHAsset.fetchAssets(withLocalIdentifiers: [localIdentifier], options: nil)
    guard let asset = assets.firstObject else {
      rejecter("NOT_FOUND", "PHAsset not found: \(localIdentifier)", nil)
      return
    }

    guard asset.mediaSubtypes.contains(.photoLive) else {
      rejecter("NOT_LIVE_PHOTO", "PHAsset \(localIdentifier) is not a Live Photo", nil)
      return
    }

    let resources = PHAssetResource.assetResources(for: asset)

    // Prefer the primary resource type; edited Live Photos may only expose fullSize variants.
    guard let photoResource = resources.first(where: { $0.type == .photo })
            ?? resources.first(where: { $0.type == .fullSizePhoto }) else {
      rejecter("NO_PHOTO_RESOURCE", "No photo resource found for \(localIdentifier)", nil)
      return
    }

    guard let videoResource = resources.first(where: { $0.type == .pairedVideo })
            ?? resources.first(where: { $0.type == .fullSizePairedVideo }) else {
      rejecter("NO_VIDEO_RESOURCE", "No paired video resource found for \(localIdentifier)", nil)
      return
    }

    let options = PHAssetResourceRequestOptions()
    options.isNetworkAccessAllowed = true

    let photoExt = (photoResource.originalFilename as NSString).pathExtension.lowercased()
    let photoDest = FileManager.default.temporaryDirectory
      .appendingPathComponent("\(UUID().uuidString).\(photoExt)")

    PHAssetResourceManager.default().writeData(for: photoResource, toFile: photoDest, options: options) { photoError in
      if let photoError = photoError {
        try? FileManager.default.removeItem(at: photoDest)
        rejecter("PHOTO_EXPORT_FAILED", photoError.localizedDescription, photoError as NSError)
        return
      }

      let videoExt = (videoResource.originalFilename as NSString).pathExtension.lowercased()
      let videoDest = FileManager.default.temporaryDirectory
        .appendingPathComponent("\(UUID().uuidString).\(videoExt)")

      PHAssetResourceManager.default().writeData(for: videoResource, toFile: videoDest, options: options) { videoError in
        if let videoError = videoError {
          // Clean up the already-written photo before rejecting
          try? FileManager.default.removeItem(at: photoDest)
          rejecter("VIDEO_EXPORT_FAILED", videoError.localizedDescription, videoError as NSError)
          return
        }

        let photoSize = (try? (FileManager.default.attributesOfItem(atPath: photoDest.path)[.size] as? NSNumber)?.int64Value) ?? 0
        let videoSize = (try? (FileManager.default.attributesOfItem(atPath: videoDest.path)[.size] as? NSNumber)?.int64Value) ?? 0

        resolver([
          "photo": [
            "uri": photoDest.absoluteString,
            "size": photoSize,
            "fileName": photoResource.originalFilename,
          ],
          "video": [
            "uri": videoDest.absoluteString,
            "size": videoSize,
            "fileName": videoResource.originalFilename,
          ],
        ])
      }
    }
  }

  // Saves a photo + paired video as a real Live Photo in the camera roll.
  // Both files must carry the original Apple asset-identifier metadata (preserved by exportLivePhotoComponents).
  @objc func saveLivePhoto(
    _ photoPath: String,
    videoPath: String,
    resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    let photoURL = URL(fileURLWithPath: photoPath)
    let videoURL = URL(fileURLWithPath: videoPath)

    PHPhotoLibrary.shared().performChanges({
      let request = PHAssetCreationRequest.forAsset()
      request.addResource(with: .photo, fileURL: photoURL, options: nil)
      request.addResource(with: .pairedVideo, fileURL: videoURL, options: nil)
    }) { success, error in
      if success {
        resolver(nil)
      } else {
        let msg = error?.localizedDescription ?? "Unknown error saving Live Photo"
        rejecter("SAVE_FAILED", msg, error as NSError?)
      }
    }
  }
}
