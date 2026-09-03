//
//  FileProviderMutationService.swift
//  InternxtFileProvider
//
//  Created by Ramon Candel on 9/4/26.
//

import FileProvider
import InternxtSwiftCore

struct FileProviderMutationService {
    let driveAPI: DriveAPI
    var trashAPI: TrashAPI? = nil

    func resolveItem(
        _ decoded: (kind: DriveItemKind, uuid: String),
        identifier: NSFileProviderItemIdentifier
    ) async throws -> FileProviderItem {
        switch decoded.kind {
        case .folder:
            let meta = try await driveAPI.getFolderMetaByUuid(uuid: decoded.uuid)
            return FileProviderItem(folderMeta: meta, identifier: identifier)
        case .file:
            let meta = try await driveAPI.getFileMetaByUuid(uuid: decoded.uuid)
            return FileProviderItem(fileMeta: meta, identifier: identifier)
        }
    }

    func rename(
        _ decoded: (kind: DriveItemKind, uuid: String),
        to newFilename: String
    ) async throws {
        switch decoded.kind {
        case .folder:
            _ = try await driveAPI.updateFolderNew(folderUuid: decoded.uuid, folderName: newFilename)
        case .file:
            let meta = try await driveAPI.getFileMetaByUuid(uuid: decoded.uuid)
            let (baseName, _) = FileProviderItem.splitNameExtension(newFilename, kind: .file)
            _ = try await driveAPI.updateFileNew(uuid: decoded.uuid, bucketId: meta.bucket, newFilename: baseName)
        }
    }

    func move(
        _ decoded: (kind: DriveItemKind, uuid: String),
        toParentUuid destinationFolderUuid: String
    ) async throws {
        switch decoded.kind {
        case .folder:
            _ = try await driveAPI.moveFolderNew(uuid: decoded.uuid, destinationFolder: destinationFolderUuid)
        case .file:
            _ = try await driveAPI.moveFileNew(uuid: decoded.uuid, destinationFolder: destinationFolderUuid)
        }
    }

    func trash(_ decoded: (kind: DriveItemKind, uuid: String)) async throws {
        guard let trashAPI else { throw NSFileProviderError(.notAuthenticated) }
        let didTrash = try await trashAPI.trashItemsByUuid(itemsToTrash: Self.trashItems(for: decoded))
        try Self.validateTrashOutcome(didTrash)
    }

    static func validateTrashOutcome(_ didTrash: Bool) throws {
        guard didTrash else { throw NSFileProviderError(.serverUnreachable) }
    }

    static func trashItems(
        for decoded: (kind: DriveItemKind, uuid: String)
    ) -> [ItemToTrashV2] {
        let type: ItemToTrashType = decoded.kind == .folder ? .Folder : .File
        return [ItemToTrashV2(uuid: decoded.uuid, type: type)]
    }
}
