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
  private static let folderContainerAnchor = NSFileProviderSyncAnchor(SyncAnchorStore.encode(0))

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
  private let syncAnchorStore = SyncAnchorStore()
  private var browsedChildIds: [String] = []

  private var isWorkingSet: Bool {
    enumeratedItemIdentifier == .workingSet
  }

  init(enumeratedItemIdentifier: NSFileProviderItemIdentifier) {
    self.enumeratedItemIdentifier = enumeratedItemIdentifier
    super.init()
  }

  func invalidate() {}

  func enumerateItems(for observer: NSFileProviderEnumerationObserver, startingAt page: NSFileProviderPage) {
    guard !isWorkingSet, FileProviderItemID.isDriveFolderContainer(enumeratedItemIdentifier) else {
      observer.didEnumerate([])
      observer.finishEnumerating(upTo: nil)
      return
    }

    guard let folderUuid = FileProviderItemID.folderUuid(for: enumeratedItemIdentifier),
          let driveAPI = DriveAPIFactory.make() else {
      observer.finishEnumeratingWithError(notAuthenticatedError())
      return
    }

    let cursor = Cursor.decode(page)
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
    accumulate(items)

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
    accumulate(items)

    if response.files.count == Self.pageSize {
      observer.finishEnumerating(upTo: Cursor(phase: .files, offset: offset + Self.pageSize).encoded())
    } else {
      seedSnapshot(forFolderUuid: folderUuid)
      observer.finishEnumerating(upTo: nil)
    }
  }

  private func accumulate(_ items: [FileProviderItem]) {
    browsedChildIds.append(contentsOf: items.map { $0.itemIdentifier.rawValue })
  }

  private func seedSnapshot(forFolderUuid folderUuid: String) {
    syncAnchorStore?.saveSnapshot(browsedChildIds, forFolderUuid: folderUuid)
  }

  func currentSyncAnchor(completionHandler: @escaping (NSFileProviderSyncAnchor?) -> Void) {
    completionHandler(isWorkingSet ? workingSetAnchor() : Self.folderContainerAnchor)
  }

  func enumerateChanges(for observer: NSFileProviderChangeObserver, from anchor: NSFileProviderSyncAnchor) {
    guard isWorkingSet else {
      observer.finishEnumeratingChanges(upTo: Self.folderContainerAnchor, moreComing: false)
      return
    }
    enumerateWorkingSetChanges(for: observer, from: anchor)
  }

  private func enumerateWorkingSetChanges(for observer: NSFileProviderChangeObserver, from anchor: NSFileProviderSyncAnchor) {
    let incoming = SyncAnchorStore.decode(anchor.rawValue) ?? 0
    let current = workingSetAnchor()

    guard let store = syncAnchorStore else {
      observer.finishEnumeratingChanges(upTo: NSFileProviderSyncAnchor(SyncAnchorStore.encode(incoming)), moreComing: false)
      return
    }

    let parents = store.changedParents(after: incoming)

    guard !parents.isEmpty, let driveAPI = DriveAPIFactory.make() else {
      observer.finishEnumeratingChanges(upTo: current, moreComing: false)
      return
    }

    Task {
      do {
        for parentUuid in parents {
          try await diffFolder(parentUuid, store: store, driveAPI: driveAPI, observer: observer)
        }
        observer.finishEnumeratingChanges(upTo: current, moreComing: false)
      } catch {
        observer.finishEnumeratingChanges(
          upTo: NSFileProviderSyncAnchor(SyncAnchorStore.encode(incoming)),
          moreComing: false
        )
      }
    }
  }

  private func diffFolder(
    _ parentUuid: String,
    store: SyncAnchorStore,
    driveAPI: DriveAPI,
    observer: NSFileProviderChangeObserver
  ) async throws {
    let parent = FileProviderItemID.parentIdentifier(folderUuid: parentUuid)
    let folderUuid = FileProviderItemID.folderUuid(for: parent) ?? parentUuid

    let currentItems = try await currentChildren(of: folderUuid, parent: parent, driveAPI: driveAPI)
    let currentIds = currentItems.map { $0.itemIdentifier.rawValue }
    let prevIds = store.snapshot(forFolderUuid: parentUuid)
    let deletedIds = Set(prevIds).subtracting(currentIds)

    observer.didUpdate(currentItems)
    if !deletedIds.isEmpty {
      observer.didDeleteItems(withIdentifiers: deletedIds.map { NSFileProviderItemIdentifier($0) })
    }
    store.saveSnapshot(currentIds, forFolderUuid: parentUuid)
  }

  private func currentChildren(
    of folderUuid: String,
    parent: NSFileProviderItemIdentifier,
    driveAPI: DriveAPI
  ) async throws -> [FileProviderItem] {
    var items: [FileProviderItem] = []
    try await forEachPage { offset in
      let response = try await driveAPI.getFolderFolders(
        folderUuid: folderUuid, offset: offset, limit: Self.pageSize, order: Self.order
      )
      items.append(contentsOf: response.folders.map { FileProviderItem(folder: $0, parent: parent) })
      return response.folders.count
    }
    try await forEachPage { offset in
      let response = try await driveAPI.getFolderFilesV2(
        folderUuid: folderUuid, offset: offset, limit: Self.pageSize, order: Self.order
      )
      items.append(contentsOf: response.files.map { FileProviderItem(file: $0, parent: parent) })
      return response.files.count
    }
    return items
  }

  private func forEachPage(_ fetchPage: (_ offset: Int) async throws -> Int) async throws {
    var offset = 0
    while true {
      let count = try await fetchPage(offset)
      if count < Self.pageSize { break }
      offset += Self.pageSize
    }
  }

  private func workingSetAnchor() -> NSFileProviderSyncAnchor {
    guard let store = syncAnchorStore else {
      return NSFileProviderSyncAnchor(SyncAnchorStore.encode(0))
    }
    return NSFileProviderSyncAnchor(store.currentData)
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
}
