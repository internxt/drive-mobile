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
        progressHandler: @escaping (Double) -> Void
    ) async throws -> (url: URL, meta: GetFileMetaByIdResponse) {
        let encryptedTmp = Self.temporaryFileURL()
        let plainTmp = Self.temporaryFileURL()
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

    static func temporaryFileURL() -> URL {
        FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    }
}
