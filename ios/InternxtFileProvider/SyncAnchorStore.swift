import Foundation

struct SyncAnchorStore {
  static let appGroupIdentifier = "group.com.internxt.snacks"

  private static let counterFileName = "InternxtFileProviderSyncAnchorCounter"
  private static let changesFileName = "InternxtFileProviderPendingChanges"
  private static let snapshotsFileName = "InternxtFileProviderFolderSnapshots"
  private static let maxEntries = 50
  private static let maxTrackedFolders = 50

  private let counterURL: URL
  private let changesURL: URL
  private let snapshotsURL: URL

  init?(appGroupIdentifier: String = SyncAnchorStore.appGroupIdentifier) {
    guard let container = FileManager.default.containerURL(
      forSecurityApplicationGroupIdentifier: appGroupIdentifier
    ) else { return nil }
    self.counterURL = container.appendingPathComponent(Self.counterFileName)
    self.changesURL = container.appendingPathComponent(Self.changesFileName)
    self.snapshotsURL = container.appendingPathComponent(Self.snapshotsFileName)
  }

  init(directory: URL) {
    self.counterURL = directory.appendingPathComponent(Self.counterFileName)
    self.changesURL = directory.appendingPathComponent(Self.changesFileName)
    self.snapshotsURL = directory.appendingPathComponent(Self.snapshotsFileName)
  }

  var currentValue: UInt64 {
    guard let data = try? Data(contentsOf: counterURL),
          let value = Self.decode(data) else {
      return 0
    }
    return value
  }

  var currentData: Data {
    Self.encode(currentValue)
  }

  @discardableResult
  func recordChange(parentUuid: String) -> UInt64 {
    let next = currentValue &+ 1
    try? Self.encode(next).write(to: counterURL, options: .atomic)

    var map = readChanges()
    map[parentUuid] = next
    writeChanges(boundedChanges(map))

    return next
  }

  func changedParents(after incoming: UInt64) -> [String] {
    readChanges()
      .filter { $0.value > incoming }
      .sorted { $0.value < $1.value }
      .map { $0.key }
  }

  func snapshot(forFolderUuid folderUuid: String) -> [String] {
    readSnapshots()[folderUuid] ?? []
  }

  func saveSnapshot(_ identifiers: [String], forFolderUuid folderUuid: String) {
    var snapshots = readSnapshots()
    snapshots[folderUuid] = identifiers
    writeSnapshots(boundedSnapshots(snapshots, keeping: folderUuid))
  }

  static func encode(_ value: UInt64) -> Data {
    withUnsafeBytes(of: value.bigEndian) { Data($0) }
  }

  static func decode(_ data: Data) -> UInt64? {
    guard data.count == MemoryLayout<UInt64>.size else { return nil }
    return data.withUnsafeBytes { $0.load(as: UInt64.self).bigEndian }
  }

  private func readChanges() -> [String: UInt64] {
    guard let data = try? Data(contentsOf: changesURL),
          let map = try? JSONDecoder().decode([String: UInt64].self, from: data) else {
      return [:]
    }
    return map
  }

  private func writeChanges(_ map: [String: UInt64]) {
    guard let data = try? JSONEncoder().encode(map) else { return }
    try? data.write(to: changesURL, options: .atomic)
  }

  private func boundedChanges(_ map: [String: UInt64]) -> [String: UInt64] {
    guard map.count > Self.maxEntries else { return map }
    let mostRecent = map.sorted { $0.value > $1.value }.prefix(Self.maxEntries)
    return Dictionary(uniqueKeysWithValues: mostRecent.map { ($0.key, $0.value) })
  }

  private func readSnapshots() -> [String: [String]] {
    guard let data = try? Data(contentsOf: snapshotsURL),
          let map = try? JSONDecoder().decode([String: [String]].self, from: data) else {
      return [:]
    }
    return map
  }

  private func writeSnapshots(_ map: [String: [String]]) {
    guard let data = try? JSONEncoder().encode(map) else { return }
    try? data.write(to: snapshotsURL, options: .atomic)
  }

  // Simple eviction: when over the cap, keep the folder just written and an
  // arbitrary subset of the rest. The snapshot is only an optimization for
  // detecting removals; a missing snapshot just means "no removals reported",
  // never incorrect state.
  private func boundedSnapshots(_ map: [String: [String]], keeping folderUuid: String) -> [String: [String]] {
    guard map.count > Self.maxTrackedFolders else { return map }
    var trimmed = map
    for key in trimmed.keys where key != folderUuid {
      if trimmed.count <= Self.maxTrackedFolders { break }
      trimmed.removeValue(forKey: key)
    }
    return trimmed
  }
}
