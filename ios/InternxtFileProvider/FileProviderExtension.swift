//
//  FileProviderExtension.swift
//  InternxtFileProvider
//
//  Created by Ramon Candel on 9/4/26.
//

import FileProvider
import InternxtSwiftCore

class FileProviderExtension: NSObject, NSFileProviderReplicatedExtension {
    private let rootDisplayName: String

    required init(domain: NSFileProviderDomain) {
        self.rootDisplayName = domain.displayName
        super.init()
    }

    func invalidate() {
        // TODO: cleanup any resources
    }

    func item(for identifier: NSFileProviderItemIdentifier, request: NSFileProviderRequest, completionHandler: @escaping (NSFileProviderItem?, Error?) -> Void) -> Progress {
        if identifier == .rootContainer {
            let rootItem = FileProviderItem.root(displayName: rootDisplayName)
            completionHandler(rootItem, nil)
            return Progress()
        }

        guard let decoded = FileProviderItemID.decode(identifier) else {
            completionHandler(nil, NSFileProviderError(.noSuchItem))
            return Progress()
        }

        guard let driveAPI = DriveAPIFactory.make() else {
            completionHandler(nil, NSFileProviderError(.notAuthenticated))
            return Progress()
        }

        let progress = Progress(totalUnitCount: 1)
        Task {
            do {
                let item = try await resolveItem(decoded, identifier: identifier, driveAPI: driveAPI)
                progress.completedUnitCount = 1
                completionHandler(item, nil)
            } catch {
                completionHandler(nil, lookupError(from: error))
            }
        }
        return progress
    }

    private func resolveItem(
        _ decoded: (kind: DriveItemKind, uuid: String),
        identifier: NSFileProviderItemIdentifier,
        driveAPI: DriveAPI
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

    private func lookupError(from error: Error) -> Error {
        if let apiError = error as? APIClientError, apiError.statusCode == 401 {
            return NSFileProviderError(.notAuthenticated)
        }
        return error
    }

    func fetchContents(for itemIdentifier: NSFileProviderItemIdentifier, version requestedVersion: NSFileProviderItemVersion?, request: NSFileProviderRequest, completionHandler: @escaping (URL?, NSFileProviderItem?, Error?) -> Void) -> Progress {
        // TODO: implement fetching of the contents for the itemIdentifier at the specified version

        completionHandler(nil, nil, NSError(domain: NSCocoaErrorDomain, code: NSFeatureUnsupportedError, userInfo:[:]))
        return Progress()
    }
    
    func createItem(basedOn itemTemplate: NSFileProviderItem, fields: NSFileProviderItemFields, contents url: URL?, options: NSFileProviderCreateItemOptions = [], request: NSFileProviderRequest, completionHandler: @escaping (NSFileProviderItem?, NSFileProviderItemFields, Bool, Error?) -> Void) -> Progress {
        // TODO: a new item was created on disk, process the item's creation
        
        completionHandler(itemTemplate, [], false, nil)
        return Progress()
    }
    
    func modifyItem(_ item: NSFileProviderItem, baseVersion version: NSFileProviderItemVersion, changedFields: NSFileProviderItemFields, contents newContents: URL?, options: NSFileProviderModifyItemOptions = [], request: NSFileProviderRequest, completionHandler: @escaping (NSFileProviderItem?, NSFileProviderItemFields, Bool, Error?) -> Void) -> Progress {
        // TODO: an item was modified on disk, process the item's modification
        
        completionHandler(nil, [], false, NSError(domain: NSCocoaErrorDomain, code: NSFeatureUnsupportedError, userInfo:[:]))
        return Progress()
    }
    
    func deleteItem(identifier: NSFileProviderItemIdentifier, baseVersion version: NSFileProviderItemVersion, options: NSFileProviderDeleteItemOptions = [], request: NSFileProviderRequest, completionHandler: @escaping (Error?) -> Void) -> Progress {
        // TODO: an item was deleted on disk, process the item's deletion
        
        completionHandler(NSError(domain: NSCocoaErrorDomain, code: NSFeatureUnsupportedError, userInfo:[:]))
        return Progress()
    }
    
    func enumerator(for containerItemIdentifier: NSFileProviderItemIdentifier, request: NSFileProviderRequest) throws -> NSFileProviderEnumerator {
        return FileProviderEnumerator(enumeratedItemIdentifier: containerItemIdentifier)
    }
}
