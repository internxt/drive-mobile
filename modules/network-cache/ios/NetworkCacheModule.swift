import ExpoModulesCore
import Foundation

public class NetworkCacheModule: Module {
  public func definition() -> ModuleDefinition {
    Name("NetworkCache")

    AsyncFunction("clearNetworkCache") { () -> Bool in
      // 1. Reset shared URLSession — clears cookies, caches, credentials, and HSTS policies
      await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
        URLSession.shared.reset {
          continuation.resume()
        }
      }

      // 2. Delete HSTS.plist file as extra safety measure
      let libraryDir = FileManager.default.urls(for: .libraryDirectory, in: .userDomainMask).first
      if let cookiesDir = libraryDir?.appendingPathComponent("Cookies") {
        let hstsFile = cookiesDir.appendingPathComponent("HSTS.plist")
        try? FileManager.default.removeItem(at: hstsFile)
      }

      return true
    }
  }
}
