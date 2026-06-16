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
}
