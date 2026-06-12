//
//  FileProviderEnumerator.swift
//  InternxtFileProvider
//
//  Created by Ramon Candel on 9/4/26.
//

import FileProvider
import InternxtSwiftCore

class FileProviderEnumerator: NSObject, NSFileProviderEnumerator {

  private static let pageSize = 50
  private static let order = "ASC"

  private enum Phase: String {
    case folders
    case files
  }

  private struct Cursor {
    let phase: Phase
    let offset: Int

    static let initial = Cursor(phase: .folders, offset: 0)

    func encoded() -> NSFileProviderPage {
      NSFileProviderPage("\(phase.rawValue):\(offset)".data(using: .utf8)!)
    }

    static func decode(_ page: NSFileProviderPage) -> Cursor {
      guard let raw = String(data: page.rawValue, encoding: .utf8),
            let separatorIndex = raw.firstIndex(of: ":"),
            let phase = Phase(rawValue: String(raw[raw.startIndex..<separatorIndex])),
            let offset = Int(raw[raw.index(after: separatorIndex)...]) else {
        return .initial
      }
      return Cursor(phase: phase, offset: offset)
    }
  }

  private let enumeratedItemIdentifier: NSFileProviderItemIdentifier
  private let anchor = NSFileProviderSyncAnchor("an anchor".data(using: .utf8)!)

  init(enumeratedItemIdentifier: NSFileProviderItemIdentifier) {
    self.enumeratedItemIdentifier = enumeratedItemIdentifier
    super.init()
  }

  func invalidate() {}

  func enumerateItems(for observer: NSFileProviderEnumerationObserver, startingAt page: NSFileProviderPage) {
    let cursor = Cursor.decode(page)

    guard FileProviderItemID.isDriveFolderContainer(enumeratedItemIdentifier) else {
      observer.didEnumerate([])
      observer.finishEnumerating(upTo: nil)
      return
    }

    guard let folderUuid = FileProviderItemID.folderUuid(for: enumeratedItemIdentifier),
          let driveAPI = DriveAPIFactory.make() else {
      observer.finishEnumeratingWithError(notAuthenticatedError())
      return
    }

    Task {
      do {
        switch cursor.phase {
        case .folders:
          try await enumerateFolders(driveAPI, folderUuid: folderUuid, offset: cursor.offset, observer: observer)
        case .files:
          try await enumerateFiles(driveAPI, folderUuid: folderUuid, offset: cursor.offset, observer: observer)
        }
      } catch {
        observer.finishEnumeratingWithError(enumerationError(from: error))
      }
    }
  }

  private func enumerateFolders(
    _ driveAPI: DriveAPI,
    folderUuid: String,
    offset: Int,
    observer: NSFileProviderEnumerationObserver
  ) async throws {
    let response = try await driveAPI.getFolderFolders(
      folderUuid: folderUuid, offset: offset, limit: Self.pageSize, order: Self.order
    )
    let items = response.folders.map {
      FileProviderItem(folder: $0, parent: enumeratedItemIdentifier)
    }
    observer.didEnumerate(items)

    if response.folders.count == Self.pageSize {
      observer.finishEnumerating(upTo: Cursor(phase: .folders, offset: offset + Self.pageSize).encoded())
    } else {
      observer.finishEnumerating(upTo: Cursor(phase: .files, offset: 0).encoded())
    }
  }

  private func enumerateFiles(
    _ driveAPI: DriveAPI,
    folderUuid: String,
    offset: Int,
    observer: NSFileProviderEnumerationObserver
  ) async throws {
    let response = try await driveAPI.getFolderFilesV2(
      folderUuid: folderUuid, offset: offset, limit: Self.pageSize, order: Self.order
    )
    let items = response.files.map {
      FileProviderItem(file: $0, parent: enumeratedItemIdentifier)
    }
    observer.didEnumerate(items)

    if response.files.count == Self.pageSize {
      observer.finishEnumerating(upTo: Cursor(phase: .files, offset: offset + Self.pageSize).encoded())
    } else {
      observer.finishEnumerating(upTo: nil)
    }
  }

  private func notAuthenticatedError() -> Error {
    NSFileProviderError(.notAuthenticated)
  }

  private func enumerationError(from error: Error) -> Error {
    if let apiError = error as? APIClientError, apiError.statusCode == 401 {
      return notAuthenticatedError()
    }
    return error
  }

  func enumerateChanges(for observer: NSFileProviderChangeObserver, from anchor: NSFileProviderSyncAnchor) {
    observer.finishEnumeratingChanges(upTo: anchor, moreComing: false)
  }

  func currentSyncAnchor(completionHandler: @escaping (NSFileProviderSyncAnchor?) -> Void) {
    completionHandler(anchor)
  }
}
