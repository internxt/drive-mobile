import FileProvider
import Foundation

@available(iOS 16.0, *)
enum FileProviderDomainManager {
  static let domainIdentifier = NSFileProviderDomainIdentifier("com.internxt.drive")
  static let displayName = "Internxt Drive"

  private static var domain: NSFileProviderDomain {
    NSFileProviderDomain(identifier: domainIdentifier, displayName: displayName)
  }

  static func registerDomain(completion: @escaping (Error?) -> Void) {
    NSFileProviderManager.add(domain) { error in
      completion(isAlreadyExists(error) ? nil : error)
    }
  }

  static func unregisterDomain(completion: @escaping (Error?) -> Void) {
    NSFileProviderManager.removeAllDomains { removeError in
      completion(isNotFound(removeError) ? nil : removeError)
    }
  }

  static func signalEnumeration(completion: @escaping (Error?) -> Void) {
    signalEnumeration(for: .workingSet, completion: completion)
  }

  static func signalEnumeration(
    for container: NSFileProviderItemIdentifier,
    completion: @escaping (Error?) -> Void
  ) {
    guard let manager = NSFileProviderManager(for: domain) else {
      completion(NSError(
        domain: "FileProviderDomainManager",
        code: -1,
        userInfo: [NSLocalizedDescriptionKey: "No NSFileProviderManager for domain \(domainIdentifier.rawValue)"]
      ))
      return
    }
    manager.signalEnumerator(for: container) { error in
      completion(error)
    }
  }

  private static func isAlreadyExists(_ error: Error?) -> Bool {
    guard let error = error as NSError? else { return false }
    return error.domain == NSCocoaErrorDomain && error.code == NSFileWriteFileExistsError
  }

  private static func isNotFound(_ error: Error?) -> Bool {
    guard let error = error as NSError? else { return false }
    return error.domain == NSCocoaErrorDomain && error.code == NSFileNoSuchFileError
  }
}
