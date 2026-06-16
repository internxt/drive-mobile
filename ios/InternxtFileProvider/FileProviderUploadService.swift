//
//  FileProviderUploadService.swift
//  InternxtFileProvider
//
//  Created by Ramon Candel on 9/4/26.
//

import FileProvider
import InternxtSwiftCore

struct FileProviderUploadService {
    let driveAPI: DriveAPI
    let networkFacade: NetworkFacade

    func createFolder(
        name: String,
        parentUuid: String
    ) async throws -> CreateFolderResponseNew {
        try await driveAPI.createFolderNew(parentFolderUuid: parentUuid, folderName: name)
    }

    func uploadFile(
        filename: String,
        contentsURL: URL,
        parentUuid: String,
        encryptedOutput: URL,
        progressHandler: @escaping (Double) -> Void
    ) async throws -> UploadResult {
        let meta = try await driveAPI.getFolderMetaByUuid(uuid: parentUuid)
        guard let bucket = try await resolveBucket(parentMeta: meta) else {
            return .notAuthenticated
        }
        guard let input = InputStream(url: contentsURL) else {
            return .noSuchItem
        }

        let fileSize = Self.fileSize(of: contentsURL)
        let finish = try await networkFacade.uploadFile(
            input: input,
            encryptedOutput: encryptedOutput,
            fileSize: fileSize,
            bucketId: bucket,
            progressHandler: progressHandler
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

        return .created(created)
    }

    private func resolveBucket(parentMeta: GetFolderMetaByIdResponse) async throws -> String? {
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

    enum UploadResult {
        case created(CreateFileResponseNew)
        case notAuthenticated
        case noSuchItem
    }
}
