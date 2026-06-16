//
//  FileProviderExtension.swift
//  InternxtFileProvider
//
//  Created by Ramon Candel on 9/4/26.
//

import FileProvider
import InternxtSwiftCore
import UniformTypeIdentifiers

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
        return NSFileProviderError(.noSuchItem)
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
        guard let driveAPI = DriveAPIFactory.make(), let networkFacade = NetworkFacadeFactory.make() else {
            completionHandler(nil, [], false, NSFileProviderError(.notAuthenticated))
            return Progress()
        }

        guard let parentUuid = FileProviderItemID.folderUuid(for: itemTemplate.parentItemIdentifier) else {
            completionHandler(nil, [], false, NSFileProviderError(.noSuchItem))
            return Progress()
        }

        let parentIdentifier = itemTemplate.parentItemIdentifier

        if itemTemplate.contentType?.conforms(to: .folder) == true {
            return createFolder(
                name: itemTemplate.filename,
                parentUuid: parentUuid,
                parentIdentifier: parentIdentifier,
                driveAPI: driveAPI,
                completionHandler: completionHandler
            )
        }

        guard let contentsURL = url else {
            completionHandler(nil, [], false, NSFileProviderError(.noSuchItem))
            return Progress()
        }

        return uploadFile(
            filename: itemTemplate.filename,
            contentsURL: contentsURL,
            parentUuid: parentUuid,
            parentIdentifier: parentIdentifier,
            driveAPI: driveAPI,
            networkFacade: networkFacade,
            completionHandler: completionHandler
        )
    }

    private func createFolder(
        name: String,
        parentUuid: String,
        parentIdentifier: NSFileProviderItemIdentifier,
        driveAPI: DriveAPI,
        completionHandler: @escaping (NSFileProviderItem?, NSFileProviderItemFields, Bool, Error?) -> Void
    ) -> Progress {
        let progress = Progress(totalUnitCount: 1)
        Task {
            do {
                let response = try await driveAPI.createFolderNew(parentFolderUuid: parentUuid, folderName: name)
                progress.completedUnitCount = 1
                let item = FileProviderItem(folder: response, parent: parentIdentifier)
                completionHandler(item, [], false, nil)
            } catch {
                completionHandler(nil, [], false, lookupError(from: error))
            }
        }
        return progress
    }

    private func uploadFile(
        filename: String,
        contentsURL: URL,
        parentUuid: String,
        parentIdentifier: NSFileProviderItemIdentifier,
        driveAPI: DriveAPI,
        networkFacade: NetworkFacade,
        completionHandler: @escaping (NSFileProviderItem?, NSFileProviderItemFields, Bool, Error?) -> Void
    ) -> Progress {
        let progress = Progress(totalUnitCount: 100)
        Task {
            let encryptedTmp = Self.temporaryFileURL()
            defer { try? FileManager.default.removeItem(at: encryptedTmp) }

            do {
                let meta = try await driveAPI.getFolderMetaByUuid(uuid: parentUuid)
                guard let bucket = try await Self.resolveBucket(parentMeta: meta, driveAPI: driveAPI) else {
                    completionHandler(nil, [], false, NSFileProviderError(.notAuthenticated))
                    return
                }
                guard let input = InputStream(url: contentsURL) else {
                    completionHandler(nil, [], false, NSFileProviderError(.noSuchItem))
                    return
                }

                let fileSize = Self.fileSize(of: contentsURL)
                let finish = try await networkFacade.uploadFile(
                    input: input,
                    encryptedOutput: encryptedTmp,
                    fileSize: fileSize,
                    bucketId: bucket,
                    progressHandler: { fraction in
                        progress.completedUnitCount = Int64(fraction * 100)
                    }
                )

                let (baseName, fileExtension) = Self.splitNameExtension(filename)
                let created = try await driveAPI.createFileNew(createFile: CreateFileDataNew(
                    fileId: finish.id,
                    type: fileExtension,
                    bucket: bucket,
                    size: fileSize,
                    folderId: meta.id,
                    name: baseName,
                    plainName: baseName,
                    folderUuid: parentUuid
                ))

                let item = FileProviderItem(file: created, parent: parentIdentifier)
                completionHandler(item, [], false, nil)
            } catch {
                completionHandler(nil, [], false, lookupError(from: error))
            }
        }
        return progress
    }

    private static func resolveBucket(parentMeta: GetFolderMetaByIdResponse, driveAPI: DriveAPI) async throws -> String? {
        if let bucket = parentMeta.bucket {
            return bucket
        }
        guard let rootUuid = FileProviderItemID.rootFolderUuid() else {
            return nil
        }
        let rootMeta = try await driveAPI.getFolderMetaByUuid(uuid: rootUuid)
        return rootMeta.bucket
    }

    private static func fileSize(of url: URL) -> Int {
        let values = try? url.resourceValues(forKeys: [.fileSizeKey])
        return values?.fileSize ?? 0
    }

    private static func splitNameExtension(_ filename: String) -> (base: String, fileExtension: String?) {
        FileProviderItem.splitNameExtension(filename, kind: .file)
    }
    
    func modifyItem(_ item: NSFileProviderItem, baseVersion version: NSFileProviderItemVersion, changedFields: NSFileProviderItemFields, contents newContents: URL?, options: NSFileProviderModifyItemOptions = [], request: NSFileProviderRequest, completionHandler: @escaping (NSFileProviderItem?, NSFileProviderItemFields, Bool, Error?) -> Void) -> Progress {
        if changedFields.contains(.contents) || changedFields.contains(.parentItemIdentifier) {
            completionHandler(item, [], false, nil)
            return Progress()
        }

        if changedFields.contains(.filename) {
            return renameItem(item, completionHandler: completionHandler)
        }

        completionHandler(item, [], false, nil)
        return Progress()
    }

    private func renameItem(
        _ item: NSFileProviderItem,
        completionHandler: @escaping (NSFileProviderItem?, NSFileProviderItemFields, Bool, Error?) -> Void
    ) -> Progress {
        guard let driveAPI = DriveAPIFactory.make() else {
            completionHandler(nil, [], false, NSFileProviderError(.notAuthenticated))
            return Progress()
        }

        guard let decoded = FileProviderItemID.decode(item.itemIdentifier) else {
            completionHandler(nil, [], false, NSFileProviderError(.noSuchItem))
            return Progress()
        }

        let newFilename = item.filename
        let progress = Progress(totalUnitCount: 1)
        Task {
            do {
                try await rename(decoded, to: newFilename, driveAPI: driveAPI)
                progress.completedUnitCount = 1
                let renamed = FileProviderItem.renamed(from: item, newFilename: newFilename) ?? item
                completionHandler(renamed, [], false, nil)
            } catch {
                completionHandler(nil, [], false, lookupError(from: error))
            }
        }
        return progress
    }

    private func rename(
        _ decoded: (kind: DriveItemKind, uuid: String),
        to newFilename: String,
        driveAPI: DriveAPI
    ) async throws {
        switch decoded.kind {
        case .folder:
            _ = try await driveAPI.updateFolderNew(folderUuid: decoded.uuid, folderName: newFilename)
        case .file:
            let meta = try await driveAPI.getFileMetaByUuid(uuid: decoded.uuid)
            let (baseName, _) = Self.splitNameExtension(newFilename)
            _ = try await driveAPI.updateFileNew(uuid: decoded.uuid, bucketId: meta.bucket, newFilename: baseName)
        }
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
