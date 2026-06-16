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

        let mutationService = FileProviderMutationService(driveAPI: driveAPI)
        let progress = Progress(totalUnitCount: 1)
        Task {
            do {
                let item = try await mutationService.resolveItem(decoded, identifier: identifier)
                progress.completedUnitCount = 1
                completionHandler(item, nil)
            } catch {
                completionHandler(nil, FileProviderErrorMapper.lookupError(from: error))
            }
        }
        return progress
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

        let downloadService = FileProviderDownloadService(driveAPI: driveAPI, networkFacade: networkFacade)
        let progress = Progress(totalUnitCount: 100)
        Task {
            do {
                let result = try await downloadService.fetchContents(uuid: decoded.uuid) { fraction in
                    progress.completedUnitCount = Int64(fraction * 100)
                }
                let item = FileProviderItem(fileMeta: result.meta, identifier: itemIdentifier)
                completionHandler(result.url, item, nil)
            } catch {
                completionHandler(nil, nil, FileProviderErrorMapper.lookupError(from: error))
            }
        }
        return progress
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
        let uploadService = FileProviderUploadService(driveAPI: driveAPI, networkFacade: networkFacade)

        let isFolder = itemTemplate.contentType?.conforms(to: .folder) == true

        if isFolder {
            return createFolder(
                name: itemTemplate.filename,
                parentUuid: parentUuid,
                parentIdentifier: parentIdentifier,
                uploadService: uploadService,
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
            uploadService: uploadService,
            completionHandler: completionHandler
        )
    }

    private func createFolder(
        name: String,
        parentUuid: String,
        parentIdentifier: NSFileProviderItemIdentifier,
        uploadService: FileProviderUploadService,
        completionHandler: @escaping (NSFileProviderItem?, NSFileProviderItemFields, Bool, Error?) -> Void
    ) -> Progress {
        let progress = Progress(totalUnitCount: 1)
        Task {
            do {
                let response = try await uploadService.createFolder(name: name, parentUuid: parentUuid)
                progress.completedUnitCount = 1
                let item = FileProviderItem(folder: response, parent: parentIdentifier)
                completionHandler(item, [], false, nil)
            } catch {
                completionHandler(nil, [], false, FileProviderErrorMapper.lookupError(from: error))
            }
        }
        return progress
    }

    private func uploadFile(
        filename: String,
        contentsURL: URL,
        parentUuid: String,
        parentIdentifier: NSFileProviderItemIdentifier,
        uploadService: FileProviderUploadService,
        completionHandler: @escaping (NSFileProviderItem?, NSFileProviderItemFields, Bool, Error?) -> Void
    ) -> Progress {
        let progress = Progress(totalUnitCount: 100)
        Task {
            let encryptedTmp = FileProviderDownloadService.temporaryFileURL()
            defer { try? FileManager.default.removeItem(at: encryptedTmp) }

            do {
                let result = try await uploadService.uploadFile(
                    filename: filename,
                    contentsURL: contentsURL,
                    parentUuid: parentUuid,
                    encryptedOutput: encryptedTmp,
                    progressHandler: { fraction in
                        progress.completedUnitCount = Int64(fraction * 100)
                    }
                )

                switch result {
                case .created(let created):
                    let item = FileProviderItem(file: created, parent: parentIdentifier)
                    completionHandler(item, [], false, nil)
                case .notAuthenticated:
                    completionHandler(nil, [], false, NSFileProviderError(.notAuthenticated))
                case .noSuchItem:
                    completionHandler(nil, [], false, NSFileProviderError(.noSuchItem))
                }
            } catch {
                completionHandler(nil, [], false, FileProviderErrorMapper.lookupError(from: error))
            }
        }
        return progress
    }

    func modifyItem(_ item: NSFileProviderItem, baseVersion version: NSFileProviderItemVersion, changedFields: NSFileProviderItemFields, contents newContents: URL?, options: NSFileProviderModifyItemOptions = [], request: NSFileProviderRequest, completionHandler: @escaping (NSFileProviderItem?, NSFileProviderItemFields, Bool, Error?) -> Void) -> Progress {
        let shouldRename = changedFields.contains(.filename)
        let shouldMove = changedFields.contains(.parentItemIdentifier)

        guard shouldRename || shouldMove else {
            completionHandler(item, [], false, nil)
            return Progress()
        }

        guard let driveAPI = DriveAPIFactory.make() else {
            completionHandler(nil, [], false, NSFileProviderError(.notAuthenticated))
            return Progress()
        }

        guard let decoded = FileProviderItemID.decode(item.itemIdentifier) else {
            completionHandler(nil, [], false, NSFileProviderError(.noSuchItem))
            return Progress()
        }

        var destinationFolderUuid: String?
        if shouldMove {
            guard let resolved = FileProviderItemID.folderUuid(for: item.parentItemIdentifier) else {
                completionHandler(nil, [], false, NSFileProviderError(.noSuchItem))
                return Progress()
            }
            destinationFolderUuid = resolved
        }

        let mutationService = FileProviderMutationService(driveAPI: driveAPI)
        let newFilename = item.filename
        let progress = Progress(totalUnitCount: 1)
        Task {
            do {
                if shouldRename {
                    try await mutationService.rename(decoded, to: newFilename)
                }
                if let destinationFolderUuid {
                    try await mutationService.move(decoded, toParentUuid: destinationFolderUuid)
                }
                progress.completedUnitCount = 1
                let modified = shouldRename
                    ? (FileProviderItem.renamed(from: item, newFilename: newFilename) ?? item)
                    : item
                completionHandler(modified, [], false, nil)
            } catch {
                completionHandler(nil, [], false, FileProviderErrorMapper.lookupError(from: error))
            }
        }
        return progress
    }

    func deleteItem(identifier: NSFileProviderItemIdentifier, baseVersion version: NSFileProviderItemVersion, options: NSFileProviderDeleteItemOptions = [], request: NSFileProviderRequest, completionHandler: @escaping (Error?) -> Void) -> Progress {
        guard let driveAPI = DriveAPIFactory.make(), let trashAPI = DriveAPIFactory.makeTrash() else {
            completionHandler(NSFileProviderError(.notAuthenticated))
            return Progress()
        }

        guard let decoded = FileProviderItemID.decode(identifier) else {
            completionHandler(NSFileProviderError(.noSuchItem))
            return Progress()
        }

        let mutationService = FileProviderMutationService(driveAPI: driveAPI, trashAPI: trashAPI)
        let progress = Progress(totalUnitCount: 1)
        Task {
            do {
                try await mutationService.trash(decoded)
                progress.completedUnitCount = 1
                completionHandler(nil)
            } catch {
                completionHandler(FileProviderErrorMapper.lookupError(from: error))
            }
        }
        return progress
    }

    func enumerator(for containerItemIdentifier: NSFileProviderItemIdentifier, request: NSFileProviderRequest) throws -> NSFileProviderEnumerator {
        return FileProviderEnumerator(enumeratedItemIdentifier: containerItemIdentifier)
    }
}
