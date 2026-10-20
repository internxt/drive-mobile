//
//  FileProviderDownloadService.swift
//  InternxtFileProvider
//
//  Created by Ramon Candel on 9/4/26.
//

import FileProvider
import InternxtSwiftCore

struct FileProviderDownloadService {
    let driveAPI: DriveAPI
    let networkFacade: NetworkFacade

    func fetchContents(
        uuid: String,
        into contentsDirectory: URL,
        progressHandler: @escaping (Double) -> Void
    ) async throws -> (url: URL, meta: GetFileMetaByIdResponse) {
        let encryptedTmp = Self.temporaryFileURL()
        let plainTmp = contentsDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: encryptedTmp) }

        let meta = try await driveAPI.getFileMetaByUuid(uuid: uuid)
        _ = try await networkFacade.downloadFile(
            bucketId: meta.bucket,
            fileId: meta.fileId,
            encryptedFileDestination: encryptedTmp,
            destinationURL: plainTmp,
            progressHandler: progressHandler
        )
        return (plainTmp, meta)
    }

    /// Returns the temporary directory `NSFileProviderManager` provides for `domain`.
    /// Throws if the domain has no manager or the system cannot provide the directory.
    static func contentsDirectory(for domain: NSFileProviderDomain) throws -> URL {
        guard let manager = NSFileProviderManager(for: domain) else {
            throw CocoaError(.fileNoSuchFile)
        }
        return try manager.temporaryDirectoryURL()
    }

    static func temporaryFileURL() -> URL {
        FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    }
}
