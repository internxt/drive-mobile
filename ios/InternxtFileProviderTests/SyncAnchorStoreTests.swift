//
//  SyncAnchorStoreTests.swift
//  InternxtFileProviderTests
//

import XCTest

final class SyncAnchorStoreTests: XCTestCase {

    private var directory: URL!

    override func setUp() {
        super.setUp()
        directory = FileManager.default.temporaryDirectory
            .appendingPathComponent("SyncAnchorStoreTests.\(UUID().uuidString)")
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    }

    override func tearDown() {
        try? FileManager.default.removeItem(at: directory)
        directory = nil
        super.tearDown()
    }

    func testWhenChangeRecordedThenCurrentValueAdvancesByOne() {
        let store = SyncAnchorStore(directory: directory)
        let before = store.currentValue

        store.recordChange(parentUuid: "parent-a")

        XCTAssertEqual(store.currentValue, before + 1)
    }

    func testWhenChangeRecordedThenCurrentDataDiffersFromBefore() {
        let store = SyncAnchorStore(directory: directory)
        let before = store.currentData

        store.recordChange(parentUuid: "parent-a")

        XCTAssertNotEqual(store.currentData, before)
    }

    func testWhenReadFromSeparateInstanceThenSeesPersistedChange() {
        SyncAnchorStore(directory: directory).recordChange(parentUuid: "parent-a")

        let reader = SyncAnchorStore(directory: directory)

        XCTAssertEqual(reader.currentValue, 1)
    }

    func testWhenChangeRecordedThenChangedParentsAfterPreviousAnchorIncludesIt() {
        let store = SyncAnchorStore(directory: directory)
        let before = store.currentValue

        store.recordChange(parentUuid: "parent-a")

        XCTAssertEqual(store.changedParents(after: before), ["parent-a"])
    }

    func testWhenAnchorIsAtRecordedValueThenChangedParentsExcludesIt() {
        let store = SyncAnchorStore(directory: directory)
        let recordedAt = store.recordChange(parentUuid: "parent-a")

        XCTAssertEqual(store.changedParents(after: recordedAt), [])
    }

    func testWhenMultipleParentsRecordedThenChangedParentsReturnsOnlyNewerOnesInOrder() {
        let store = SyncAnchorStore(directory: directory)
        let afterFirst = store.recordChange(parentUuid: "parent-a")
        store.recordChange(parentUuid: "parent-b")
        store.recordChange(parentUuid: "parent-c")

        XCTAssertEqual(store.changedParents(after: afterFirst), ["parent-b", "parent-c"])
    }

    func testWhenSameParentRecordedTwiceThenItUsesTheLatestAnchorValue() {
        let store = SyncAnchorStore(directory: directory)
        store.recordChange(parentUuid: "parent-a")
        let afterSecond = store.recordChange(parentUuid: "parent-b")
        store.recordChange(parentUuid: "parent-a")

        XCTAssertEqual(store.changedParents(after: afterSecond), ["parent-a"])
    }

    func testWhenNoSnapshotSavedThenSnapshotIsEmpty() {
        let store = SyncAnchorStore(directory: directory)

        XCTAssertEqual(store.snapshot(forFolderUuid: "folder-a"), [])
    }

    func testWhenSnapshotSavedThenSnapshotRoundTrips() {
        let store = SyncAnchorStore(directory: directory)

        store.saveSnapshot(["d:file-1", "f:folder-1"], forFolderUuid: "folder-a")

        XCTAssertEqual(store.snapshot(forFolderUuid: "folder-a"), ["d:file-1", "f:folder-1"])
    }

    func testWhenSnapshotSavedFromSeparateInstanceThenItIsPersisted() {
        SyncAnchorStore(directory: directory).saveSnapshot(["d:file-1"], forFolderUuid: "folder-a")

        let reader = SyncAnchorStore(directory: directory)

        XCTAssertEqual(reader.snapshot(forFolderUuid: "folder-a"), ["d:file-1"])
    }

    func testWhenSnapshotSavedForDifferentFoldersThenTheyAreIndependent() {
        let store = SyncAnchorStore(directory: directory)

        store.saveSnapshot(["d:file-1"], forFolderUuid: "folder-a")
        store.saveSnapshot(["d:file-2"], forFolderUuid: "folder-b")

        XCTAssertEqual(store.snapshot(forFolderUuid: "folder-a"), ["d:file-1"])
        XCTAssertEqual(store.snapshot(forFolderUuid: "folder-b"), ["d:file-2"])
    }

    func testWhenSnapshotSavedAgainThenItReplacesThePrevious() {
        let store = SyncAnchorStore(directory: directory)
        store.saveSnapshot(["d:file-1", "d:file-2"], forFolderUuid: "folder-a")

        store.saveSnapshot(["d:file-2"], forFolderUuid: "folder-a")

        XCTAssertEqual(store.snapshot(forFolderUuid: "folder-a"), ["d:file-2"])
    }

    func testWhenEncodingThenDecodingThenRoundTripIsStable() {
        let value: UInt64 = 42

        let decoded = SyncAnchorStore.decode(SyncAnchorStore.encode(value))

        XCTAssertEqual(decoded, value)
    }

    func testWhenDataLengthIsWrongThenDecodeReturnsNil() {
        let malformed = Data([0x01, 0x02])

        let decoded = SyncAnchorStore.decode(malformed)

        XCTAssertNil(decoded)
    }
}
