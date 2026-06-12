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

    private static let offlineURLErrorCodes: Set<URLError.Code> = [
        .notConnectedToInternet,
        .networkConnectionLost,
        .timedOut,
        .cannotConnectToHost,
        .dataNotAllowed,
        .cannotFindHost
    ]

    private static let offlineErrorCodes: Set<ErrorCode> = [
        .networkNoConnection,
        .networkConnectionLost,
        .networkTimeout,
        .networkCannotConnect
    ]

    private func lookupError(from error: Error) -> Error {
        if isUnauthorized(error) {
            return NSFileProviderError(.notAuthenticated)
        }
        if isOffline(error) {
            return NSFileProviderError(.serverUnreachable)
        }
        return error
    }

    private func isUnauthorized(_ error: Error) -> Bool {
        if let enriched = error as? EnrichedError {
            if enriched.code == .apiUnauthorized {
                return true
            }
            if let cause = enriched.cause {
                return isUnauthorized(cause)
            }
            return false
        }
        if let apiError = error as? APIClientError {
            return apiError.statusCode == 401
        }
        return false
    }

    private func isOffline(_ error: Error) -> Bool {
        if let enriched = error as? EnrichedError {
            if Self.offlineErrorCodes.contains(enriched.code) {
                return true
            }
            if let cause = enriched.cause {
                return isOffline(cause)
            }
            return false
        }
        if let urlError = error as? URLError {
            return Self.offlineURLErrorCodes.contains(urlError.code)
        }
        if let apiError = error as? APIClientError {
            return apiError.statusCode <= 0
        }
        return false
    }

    func fetchContents(for itemIdentifier: NSFileProviderItemIdentifier, version requestedVersion: NSFileProviderItemVersion?, request: NSFileProviderRequest, completionHandler: @escaping (URL?, NSFileProviderItem?, Error?) -> Void) -> Progress {
        guard let decoded = FileProviderItemID.decode(itemIdentifier), decoded.kind == .file else {
            completionHandler(nil, nil, NSFileProviderError(.noSuchItem))
            return Progress()
        }

        guard let driveAPI = DriveAPIFactory.make(), let networkFacade = NetworkFacadeFactory.make() else {
            completionHandler(nil, nil, NSFileProviderError(.notAuthenticated))
            return Progress()
        }

        let progress = Progress(totalUnitCount: 100)
        Task {
            let encryptedTmp = Self.temporaryFileURL()
            let plainTmp = Self.temporaryFileURL()
            defer { try? FileManager.default.removeItem(at: encryptedTmp) }

            do {
                let meta = try await driveAPI.getFileMetaByUuid(uuid: decoded.uuid)
                _ = try await networkFacade.downloadFile(
                    bucketId: meta.bucket,
                    fileId: meta.fileId,
                    encryptedFileDestination: encryptedTmp,
                    destinationURL: plainTmp,
                    progressHandler: { fraction in
                        progress.completedUnitCount = Int64(fraction * 100)
                    }
                )
                let item = FileProviderItem(fileMeta: meta, identifier: itemIdentifier)
                completionHandler(plainTmp, item, nil)
            } catch {
                completionHandler(nil, nil, lookupError(from: error))
            }
        }
        return progress
    }

    private static func temporaryFileURL() -> URL {
        FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
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
