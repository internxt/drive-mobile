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

        if itemTemplate.contentType?.conforms(to: .folder) == true {
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

        let mutationService = FileProviderMutationService(driveAPI: driveAPI)
        let newFilename = item.filename
        let progress = Progress(totalUnitCount: 1)
        Task {
            do {
                try await mutationService.rename(decoded, to: newFilename)
                progress.completedUnitCount = 1
                let renamed = FileProviderItem.renamed(from: item, newFilename: newFilename) ?? item
                completionHandler(renamed, [], false, nil)
            } catch {
                completionHandler(nil, [], false, FileProviderErrorMapper.lookupError(from: error))
            }
        }
        return progress
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
