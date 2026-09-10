import FileProvider
import Foundation
import React

@objc(InternxtSignalingModule)
class FileProviderModule: NSObject {

  @objc static func requiresMainQueueSetup() -> Bool { false }

  @objc func notifyParentChanged(
    _ parentFolderUuid: String,
    resolver: @escaping RCTPromiseResolveBlock,
    rejecter _: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 16.0, *) else {
      resolver(nil)
      return
    }

    let store = SyncAnchorStore()
    _ = store?.recordChange(parentUuid: parentFolderUuid)

    signalParent(parentFolderUuid, resolver: resolver)
  }

  @available(iOS 16.0, *)
  private func signalParent(_ parentFolderUuid: String, resolver: @escaping RCTPromiseResolveBlock) {
    let container = FileProviderItemID.parentIdentifier(folderUuid: parentFolderUuid)
    FileProviderDomainManager.signalEnumeration(for: container) { _ in
      FileProviderDomainManager.signalEnumeration { _ in
        resolver(nil)
      }
    }
  }
}
