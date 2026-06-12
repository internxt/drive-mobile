import FileProvider

enum DriveItemKind: String {
  case folder = "f"
  case file = "d"
}

enum FileProviderItemID {
  private static let separator: Character = ":"

  static func encode(_ kind: DriveItemKind, uuid: String) -> NSFileProviderItemIdentifier {
    NSFileProviderItemIdentifier("\(kind.rawValue)\(separator)\(uuid)")
  }

  static func decode(_ identifier: NSFileProviderItemIdentifier) -> (kind: DriveItemKind, uuid: String)? {
    let raw = identifier.rawValue
    guard let separatorIndex = raw.firstIndex(of: separator) else { return nil }
    let prefix = String(raw[raw.startIndex..<separatorIndex])
    let uuid = String(raw[raw.index(after: separatorIndex)...])
    guard let kind = DriveItemKind(rawValue: prefix), !uuid.isEmpty else { return nil }
    return (kind, uuid)
  }

  static func isDriveFolderContainer(_ container: NSFileProviderItemIdentifier) -> Bool {
    if container == .rootContainer { return true }
    guard let decoded = decode(container) else { return false }
    return decoded.kind == .folder
  }

  static func folderUuid(for container: NSFileProviderItemIdentifier) -> String? {
    if container == .rootContainer {
      return rootFolderUuid()
    }
    guard let decoded = decode(container), decoded.kind == .folder else { return nil }
    return decoded.uuid
  }

  static func rootFolderUuid() -> String? {
    guard let data = SharedAuthKeychain.read(SharedAuthKeychain.rootFolderIdKey) else { return nil }
    let uuid = String(decoding: data, as: UTF8.self)
    return uuid.isEmpty ? nil : uuid
  }

  static func parentIdentifier(folderUuid: String?) -> NSFileProviderItemIdentifier {
    guard let folderUuid = folderUuid, !folderUuid.isEmpty else { return .rootContainer }
    if folderUuid == rootFolderUuid() { return .rootContainer }
    return encode(.folder, uuid: folderUuid)
  }
}
