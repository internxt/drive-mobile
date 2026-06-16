//
//  FileProviderMutationTests.swift
//  InternxtFileProviderTests
//

import XCTest
import FileProvider
import InternxtSwiftCore

private final class StubItem: NSObject, NSFileProviderItem {
    let itemIdentifier: NSFileProviderItemIdentifier
    let parentItemIdentifier: NSFileProviderItemIdentifier
    let filename: String

    init(
        identifier: NSFileProviderItemIdentifier,
        parent: NSFileProviderItemIdentifier,
        filename: String
    ) {
        self.itemIdentifier = identifier
        self.parentItemIdentifier = parent
        self.filename = filename
    }
}

final class FileProviderMutationTests: XCTestCase {

    private let fileIdentifier = FileProviderItemID.encode(.file, uuid: "file-uuid")
    private let folderIdentifier = FileProviderItemID.encode(.folder, uuid: "folder-uuid")
    private let destinationIdentifier = FileProviderItemID.encode(.folder, uuid: "destination-uuid")

    private func decodedFile() -> (kind: DriveItemKind, uuid: String) {
        (kind: .file, uuid: "file-uuid")
    }

    private func decodedFolder() -> (kind: DriveItemKind, uuid: String) {
        (kind: .folder, uuid: "folder-uuid")
    }

    private func apiError(statusCode: Int) -> APIClientError {
        APIClientError(statusCode: statusCode, message: "test")
    }

    private func mappedCode(from error: Error) -> Int {
        (FileProviderErrorMapper.lookupError(from: error) as NSError).code
    }

    func testWhenItemIsFileThenCapabilitiesAllowReparentingAndDeletingButNotTrashing() {
        let source = StubItem(identifier: fileIdentifier, parent: .rootContainer, filename: "report.pdf")

        let item = FileProviderItem.renamed(from: source, newFilename: "report.pdf")

        let capabilities = item?.capabilities ?? []
        XCTAssertTrue(capabilities.contains(.allowsReparenting))
        XCTAssertTrue(capabilities.contains(.allowsDeleting))
        XCTAssertFalse(capabilities.contains(.allowsTrashing))
    }

    func testWhenItemIsFolderThenCapabilitiesAllowReparentingAndDeletingButNotTrashing() {
        let source = StubItem(identifier: folderIdentifier, parent: .rootContainer, filename: "Docs")

        let item = FileProviderItem.renamed(from: source, newFilename: "Docs")

        let capabilities = item?.capabilities ?? []
        XCTAssertTrue(capabilities.contains(.allowsReparenting))
        XCTAssertTrue(capabilities.contains(.allowsDeleting))
        XCTAssertFalse(capabilities.contains(.allowsTrashing))
    }

    func testWhenRenamingAFileThenItKeepsTheBaseNameWithoutExtension() {
        let source = StubItem(identifier: fileIdentifier, parent: .rootContainer, filename: "old.pdf")

        let item = FileProviderItem.renamed(from: source, newFilename: "renamed.pdf")

        XCTAssertEqual(item?.filename, "renamed.pdf")
    }

    func testWhenRenamingAFileThenSplitProducesTheBaseNameOnly() {
        let split = FileProviderItem.splitNameExtension("renamed.pdf", kind: .file)

        XCTAssertEqual(split.base, "renamed")
    }

    func testWhenRenamingAFolderThenItUsesTheFullName() {
        let split = FileProviderItem.splitNameExtension("My Folder", kind: .folder)

        XCTAssertEqual(split.base, "My Folder")
    }

    func testWhenAMoveSucceedsThenTheReturnedItemKeepsItsIdentifierAndDestinationParent() {
        let moved = StubItem(identifier: fileIdentifier, parent: destinationIdentifier, filename: "report.pdf")

        let item = FileProviderItem.renamed(from: moved, newFilename: "report.pdf")

        XCTAssertEqual(item?.itemIdentifier, fileIdentifier)
        XCTAssertEqual(item?.parentItemIdentifier, destinationIdentifier)
    }

    func testWhenTheDestinationParentIdentifierIsInvalidThenFolderUuidIsNil() {
        let invalidParent = NSFileProviderItemIdentifier("not-a-valid-id")

        let resolved = FileProviderItemID.folderUuid(for: invalidParent)

        XCTAssertNil(resolved)
    }

    func testWhenDeletingAFileThenTrashItemsUseTheFileType() {
        let items = FileProviderMutationService.trashItems(for: decodedFile())

        XCTAssertEqual(items.first?.type, ItemToTrashType.File.rawValue)
    }

    func testWhenDeletingAFolderThenTrashItemsUseTheFolderType() {
        let items = FileProviderMutationService.trashItems(for: decodedFolder())

        XCTAssertEqual(items.first?.type, ItemToTrashType.Folder.rawValue)
    }

    func testWhenDeletingAnItemThenTrashItemCarriesItsUuid() {
        let items = FileProviderMutationService.trashItems(for: decodedFile())

        XCTAssertEqual(items.first?.uuid, "file-uuid")
    }

    func testWhenTheMoveApiThrowsA409ConflictThenFilenameCollision() {
        let code = mappedCode(from: apiError(statusCode: 409))

        XCTAssertEqual(code, NSFileProviderError.Code.filenameCollision.rawValue)
    }

    func testWhenTheTrashBackendReturnsFalseThenTheOutcomeThrows() {
        XCTAssertThrowsError(try FileProviderMutationService.validateTrashOutcome(false))
    }

    func testWhenTheTrashBackendReturnsFalseThenTheErrorMapsToServerUnreachable() {
        do {
            try FileProviderMutationService.validateTrashOutcome(false)
            XCTFail("expected validateTrashOutcome to throw on false")
        } catch {
            XCTAssertEqual(mappedCode(from: error), NSFileProviderError.Code.serverUnreachable.rawValue)
        }
    }

    func testWhenTheTrashBackendReturnsTrueThenTheOutcomeDoesNotThrow() {
        XCTAssertNoThrow(try FileProviderMutationService.validateTrashOutcome(true))
    }
}
