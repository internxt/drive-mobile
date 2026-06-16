//
//  FileProviderItem.swift
//  InternxtFileProvider
//
//  Created by Ramon Candel on 9/4/26.
//

import FileProvider
import InternxtSwiftCore
import UniformTypeIdentifiers

class FileProviderItem: NSObject, NSFileProviderItem {

  private let identifier: NSFileProviderItemIdentifier
  private let parent: NSFileProviderItemIdentifier
  private let name: String
  private let kind: DriveItemKind
  private let fileExtension: String?
  private let updatedAt: String?
  private let createdAt: String?
  private let sizeInBytes: String?

  private init(
    identifier: NSFileProviderItemIdentifier,
    parent: NSFileProviderItemIdentifier,
    name: String,
    kind: DriveItemKind,
    fileExtension: String?,
    createdAt: String?,
    updatedAt: String?,
    sizeInBytes: String?
  ) {
    self.identifier = identifier
    self.parent = parent
    self.name = name
    self.kind = kind
    self.fileExtension = fileExtension
    self.createdAt = createdAt
    self.updatedAt = updatedAt
    self.sizeInBytes = sizeInBytes
  }

  convenience init(folder: GetFolderFoldersResult, parent: NSFileProviderItemIdentifier) {
    self.init(
      identifier: FileProviderItemID.encode(.folder, uuid: folder.uuid ?? ""),
      parent: parent,
      name: folder.plainName ?? folder.name,
      kind: .folder,
      fileExtension: nil,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
      sizeInBytes: nil
    )
  }

  convenience init(file: GetFolderFilesResultV2, parent: NSFileProviderItemIdentifier) {
    self.init(
      identifier: FileProviderItemID.encode(.file, uuid: file.uuid),
      parent: parent,
      name: file.plainName ?? file.name ?? file.uuid,
      kind: .file,
      fileExtension: file.type,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
      sizeInBytes: file.size
    )
  }

  convenience init(folder: CreateFolderResponseNew, parent: NSFileProviderItemIdentifier) {
    self.init(
      identifier: FileProviderItemID.encode(.folder, uuid: folder.uuid),
      parent: parent,
      name: folder.plainName ?? folder.name,
      kind: .folder,
      fileExtension: nil,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
      sizeInBytes: nil
    )
  }

  convenience init(file: CreateFileResponseNew, parent: NSFileProviderItemIdentifier) {
    self.init(
      identifier: FileProviderItemID.encode(.file, uuid: file.uuid),
      parent: parent,
      name: file.plain_name,
      kind: .file,
      fileExtension: file.type,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
      sizeInBytes: file.size
    )
  }

  static func renamed(from item: NSFileProviderItem, newFilename: String) -> FileProviderItem? {
    guard let decoded = FileProviderItemID.decode(item.itemIdentifier) else { return nil }
    let (baseName, newExtension) = splitNameExtension(newFilename, kind: decoded.kind)
    return FileProviderItem(
      identifier: item.itemIdentifier,
      parent: item.parentItemIdentifier,
      name: baseName,
      kind: decoded.kind,
      fileExtension: newExtension,
      createdAt: iso8601String(from: item.creationDate ?? nil),
      updatedAt: iso8601String(from: item.contentModificationDate ?? nil),
      sizeInBytes: (item.documentSize ?? nil)?.stringValue
    )
  }

  private static func iso8601String(from date: Date?) -> String? {
    guard let date = date else { return nil }
    return iso8601Formatter.string(from: date)
  }

  static func splitNameExtension(_ filename: String, kind: DriveItemKind) -> (base: String, fileExtension: String?) {
    guard kind == .file else { return (filename, nil) }
    let url = URL(fileURLWithPath: filename)
    let fileExtension = url.pathExtension
    let base = url.deletingPathExtension().lastPathComponent
    if fileExtension.isEmpty || base.isEmpty {
      return (filename, nil)
    }
    return (base, fileExtension)
  }

  static func root(displayName: String) -> FileProviderItem {
    FileProviderItem(
      identifier: .rootContainer,
      parent: .rootContainer,
      name: displayName,
      kind: .folder,
      fileExtension: nil,
      createdAt: nil,
      updatedAt: nil,
      sizeInBytes: nil
    )
  }

  convenience init(folderMeta: GetFolderMetaByIdResponse, identifier: NSFileProviderItemIdentifier) {
    self.init(
      identifier: identifier,
      parent: FileProviderItemID.parentIdentifier(folderUuid: folderMeta.parentUuid),
      name: folderMeta.plainName ?? folderMeta.name ?? identifier.rawValue,
      kind: .folder,
      fileExtension: nil,
      createdAt: folderMeta.createdAt,
      updatedAt: folderMeta.updatedAt,
      sizeInBytes: nil
    )
  }

  convenience init(fileMeta: GetFileMetaByIdResponse, identifier: NSFileProviderItemIdentifier) {
    self.init(
      identifier: identifier,
      parent: FileProviderItemID.parentIdentifier(folderUuid: fileMeta.folderUuid),
      name: fileMeta.plainName ?? fileMeta.name,
      kind: .file,
      fileExtension: fileMeta.type,
      createdAt: fileMeta.createdAt,
      updatedAt: fileMeta.updatedAt,
      sizeInBytes: fileMeta.size
    )
  }

  var itemIdentifier: NSFileProviderItemIdentifier {
    identifier
  }

  var parentItemIdentifier: NSFileProviderItemIdentifier {
    parent
  }

  var capabilities: NSFileProviderItemCapabilities {
    switch kind {
    case .folder:
      return [.allowsReading, .allowsContentEnumerating, .allowsAddingSubItems, .allowsRenaming]
    case .file:
      return [.allowsReading, .allowsRenaming]
    }
  }

  var itemVersion: NSFileProviderItemVersion {
    let version = Data((updatedAt ?? identifier.rawValue).utf8)
    return NSFileProviderItemVersion(contentVersion: version, metadataVersion: version)
  }

  var filename: String {
    guard kind == .file, let fileExtension = fileExtension, !fileExtension.isEmpty else {
      return name
    }
    return "\(name).\(fileExtension)"
  }

  var contentType: UTType {
    guard kind == .file else { return .folder }
    if let fileExtension = fileExtension, !fileExtension.isEmpty,
       let type = UTType(filenameExtension: fileExtension) {
      return type
    }
    return .data
  }

  var documentSize: NSNumber? {
    guard kind == .file, let sizeInBytes = sizeInBytes,
          let bytes = Int64(sizeInBytes) else {
      return nil
    }
    return NSNumber(value: bytes)
  }

  private var isFolder: Bool {
    kind == .folder
  }

  var isUploaded: Bool {
    true
  }

  var isDownloaded: Bool {
    isFolder
  }

  var isMostRecentVersionDownloaded: Bool {
    isFolder
  }

  var creationDate: Date? {
    Self.parseISO8601(createdAt)
  }

  var contentModificationDate: Date? {
    Self.parseISO8601(updatedAt)
  }

  private static let iso8601Formatter: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter
  }()

  private static func parseISO8601(_ value: String?) -> Date? {
    guard let value = value, !value.isEmpty else { return nil }
    if let date = iso8601Formatter.date(from: value) {
      return date
    }
    let fallback = ISO8601DateFormatter()
    fallback.formatOptions = [.withInternetDateTime]
    return fallback.date(from: value)
  }
}
