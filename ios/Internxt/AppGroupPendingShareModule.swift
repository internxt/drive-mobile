import Foundation
import React

@objc(AppGroupPendingShare)
class AppGroupPendingShareModule: NSObject {

  private var appGroup: String? {
    Bundle.main.infoDictionary?["AppGroup"] as? String
  }

  @objc static func requiresMainQueueSetup() -> Bool { false }

  @objc func readPendingShare(
    _ resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    guard
      let group = appGroup,
      let base = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group),
      let json = try? String(contentsOf: base.appendingPathComponent("pending_share_upload.json"), encoding: .utf8)
    else {
      resolver(nil)
      return
    }
    resolver(json)
  }

  @objc func clearPendingShare(
    _ resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    guard let group = appGroup,
          let base = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group) else {
      resolver(nil)
      return
    }

    do {
      let jsonFile = base.appendingPathComponent("pending_share_upload.json")
      let sharedDataDir = base.appendingPathComponent("sharedData")
      if FileManager.default.fileExists(atPath: jsonFile.path) {
        try FileManager.default.removeItem(at: jsonFile)
      }
      if FileManager.default.fileExists(atPath: sharedDataDir.path) {
        try FileManager.default.removeItem(at: sharedDataDir)
      }
      resolver(nil)
    } catch {
      rejecter("CLEAR_FAILED", error.localizedDescription, error as NSError)
    }
  }

  @objc func writePendingShare(
    _ json: String,
    resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    guard
      let group = appGroup,
      let base = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group)
    else {
      resolver(nil)
      return
    }

    do {
      let jsonFile = base.appendingPathComponent("pending_share_upload.json")
      try json.write(to: jsonFile, atomically: true, encoding: .utf8)
      resolver(nil)
    } catch {
      rejecter("WRITE_FAILED", error.localizedDescription, error as NSError)
    }
  }
}
