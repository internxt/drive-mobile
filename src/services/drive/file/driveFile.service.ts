import { getHeaders } from '../../../helpers/headers';
import { DownloadedThumbnail, DriveListItem, GetModifiedFiles, SortDirection, SortType } from '../../../types/drive';
import { constants } from '../../AppService';

import asyncStorageService from '@internxt-mobile/services/AsyncStorageService';
import { SdkManager } from '@internxt-mobile/services/common';
import fileSystemService, { fs } from '@internxt-mobile/services/FileSystemService';
import { Abortable, AsyncStorageKey } from '@internxt-mobile/types/index';
import { MoveFileUuidPayload } from '@internxt/sdk/dist/drive/storage/types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { Image } from 'react-native';
import { getEnvironmentConfig } from 'src/lib/network';
import * as networkDownload from 'src/network/download';
import { DRIVE_THUMBNAILS_DIRECTORY } from '../constants';
import { driveFileCache } from './driveFileCache.service';

export type ArraySortFunction = (a: DriveListItem, b: DriveListItem) => number;
export type DriveFileDownloadOptions = {
  downloadPath: string;
  downloadProgressCallback?: (progress: number, bytesReceived: number, totalBytes: number) => void;
  decryptionProgressCallback?: (progress: number) => void;
  onAbortableReady?: (abortable: Abortable) => void;
  disableCache?: boolean;
  signal?: AbortSignal;
};
class DriveFileService {
  constructor(private sdk: SdkManager) {}
  public getNameFromUri(uri: string): string {
    const regex = /^(.*:\/{0,2})\/?(.*)$/gm;
    const fileUri = uri.replace(regex, '$2');

    return fileUri.split('/').pop() || '';
  }

  public getExtensionFromUri(uri: string): string | undefined {
    const regex = /^(.*:\/{0,2})\/?(.*)$/gm;
    const fileUri = uri.replace(regex, '$2');

    /**
     * Some file extensions on iOS are uppercase
     * https://apple.stackexchange.com/questions/415183/why-is-the-heic-suffix-sometimes-uppercase-and-sometimes-lowercase
     */
    return fileUri.split('.').pop()?.toLowerCase();
  }

  public removeExtension(filename: string): string {
    const filenameSplitted = filename.split('.');
    const extension = filenameSplitted && filenameSplitted.length > 1 ? (filenameSplitted.pop() as string) : '';

    if (extension === '') {
      return filename;
    }

    return filename.substring(0, filename.length - (extension.length + 1));
  }

  public renameIfAlreadyExists(
    items: { type: string; name: string }[],
    filename: string,
    type: string,
  ): [boolean, number, string] {
    const FILENAME_INCREMENT_REGEX = /( \([0-9]+\))$/i;
    const INCREMENT_INDEX_REGEX = /\(([^)]+)\)/;
    const infoFilenames: { cleanName: string; type: string; incrementIndex: number }[] = items
      .map((item) => {
        const cleanName = item.name.replace(FILENAME_INCREMENT_REGEX, '');
        const incrementString = item.name.match(FILENAME_INCREMENT_REGEX)?.pop()?.match(INCREMENT_INDEX_REGEX)?.pop();
        const incrementIndex = parseInt(incrementString || '0');

        return {
          cleanName,
          type: item.type,
          incrementIndex,
        };
      })
      .filter((item) => item.cleanName === filename && item.type === type)
      .sort((a, b) => b.incrementIndex - a.incrementIndex);
    const filenameExists = infoFilenames.length > 0;
    const filenameIndex = infoFilenames[0] ? infoFilenames[0].incrementIndex + 1 : 0;
    const finalFilename = filenameIndex > 0 ? this.getNextNewName(filename, filenameIndex) : filename;

    return [filenameExists, filenameIndex, finalFilename];
  }

  public getNextNewName(filename: string, i: number): string {
    return `${filename} (${i})`;
  }

  public async updateMetaData(fileUuid: string, name: string): Promise<void> {
    this.sdk.storageV2.updateFileNameWithUUID({
      fileUuid,
      name,
    });
  }

  public async moveFile(moveFilePayload: MoveFileUuidPayload) {
    return this.sdk.storageV2.moveFileByUuid(moveFilePayload);
  }

  public getSortFunction({
    type,
    direction,
  }: {
    type: SortType;
    direction: SortDirection;
  }): ArraySortFunction | undefined {
    let sortFunction: ArraySortFunction | undefined;

    switch (type) {
      case SortType.Name:
        sortFunction =
          direction === SortDirection.Asc
            ? (a: DriveListItem, b: DriveListItem) => {
                const aName = a.data.name ? Buffer.from(a.data.name.trim().toLowerCase()).toString('hex') : '';
                const bName = b.data.name ? Buffer.from(b.data.name.trim().toLowerCase()).toString('hex') : '';

                return aName < bName ? -1 : aName > bName ? 1 : 0;
              }
            : (a: DriveListItem, b: DriveListItem) => {
                const aName = Buffer.from(a.data.name?.trim().toLowerCase()).toString('hex');
                const bName = Buffer.from(b.data.name?.trim().toLowerCase()).toString('hex');

                return aName < bName ? 1 : aName > bName ? -1 : 0;
              };
        break;
      case SortType.Size:
        sortFunction =
          direction === SortDirection.Asc
            ? (a: DriveListItem, b: DriveListItem) => {
                if (!a.data.size) return 0;
                if (!b.data.size) return 0;

                const sizeA = parseInt(a.data.size as string);
                const sizeB = parseInt(b.data.size as string);

                return sizeA > sizeB ? 1 : -1;
              }
            : (a: DriveListItem, b: DriveListItem) => {
                if (!a.data.size) return 0;
                if (!b.data.size) return 0;

                const sizeA = parseInt(a.data.size as string);
                const sizeB = parseInt(b.data.size as string);
                return sizeA < sizeB ? 1 : -1;
              };
        break;
      case SortType.UpdatedAt:
        sortFunction =
          direction === SortDirection.Asc
            ? (a: DriveListItem, b: DriveListItem) => {
                const aTime = new Date(a.data.updatedAt).getTime();
                const bTime = new Date(b.data.updatedAt).getTime();

                return aTime < bTime ? 1 : -1;
              }
            : (a: DriveListItem, b: DriveListItem) => {
                const aTime = new Date(a.data.updatedAt).getTime();
                const bTime = new Date(b.data.updatedAt).getTime();

                return aTime > bTime ? 1 : -1;
              };
        break;
    }

    return sortFunction;
  }

  public async getModifiedFiles({
    limit = 50,
    offset = 0,
    updatedAt,
    status,
  }: {
    limit?: number;
    offset?: number;
    updatedAt?: string;
    status: 'ALL' | 'TRASHED' | 'REMOVED';
  }): Promise<GetModifiedFiles[] | undefined> {
    const updatedAtDate = updatedAt && `&updatedAt=${updatedAt}`;
    const query = `status=${status}&offset=${offset}&limit=${limit}${updatedAtDate}`;
    const newToken = await asyncStorageService.getItem(AsyncStorageKey.PhotosToken);

    if (!newToken) return;

    const headers = await getHeaders(newToken);

    const modifiedItems = await fetch(`${constants.DRIVE_NEW_API_URL}/files?${query}`, {
      method: 'GET',
      headers,
    });

    const parsedModifiedFiles = await modifiedItems.json();

    return parsedModifiedFiles;
  }

  public async getThumbnail(thumbnail: { bucket_id: string; bucket_file: string; type: string }) {
    const { bridgeUser, bridgePass, encryptionKey } = await getEnvironmentConfig();
    const destination = `${DRIVE_THUMBNAILS_DIRECTORY}/${thumbnail.bucket_file}.${thumbnail.type}`;

    const measureThumbnail = (path: string) => {
      return new Promise<DownloadedThumbnail>((resolve, reject) => {
        Image.getSize(
          path,
          (width, height) => {
            resolve({ width, height, uri: path });
          },
          (err) => {
            reject(err);
          },
        );
      });
    };
    if (await fileSystemService.exists(destination)) {
      return measureThumbnail(fileSystemService.pathToUri(destination));
    }

    await networkDownload.downloadThumbnail(
      thumbnail.bucket_file.toString(),
      thumbnail.bucket_id,
      encryptionKey,
      {
        user: bridgeUser,
        pass: bridgePass,
      },
      {
        toPath: destination,
        downloadProgressCallback: () => {
          /** NOOP */
        },
        decryptionProgressCallback: () => {
          /** NOOP */
        },
      },
      function () {
        /** NOOP */
      },
    );

    return measureThumbnail(fileSystemService.pathToUri(destination));
  }

  /**
   * Download and decrypt a file to a given filesystem path
   *
   * @param user The user details of the user who owns the file
   * @param fileId FileID of the file to download
   * @param options Options to configure the download
   * @returns
   */
  async downloadFile(
    user: UserSettings,
    bucketId: string,
    fileId: string,
    {
      downloadPath,
      downloadProgressCallback,
      onAbortableReady,
      decryptionProgressCallback,
      disableCache,
      signal,
    }: DriveFileDownloadOptions,
    fileSize: number,
  ) {
    const noop = () => {
      /** NOOP */
    };

    await networkDownload.downloadFile(
      fileId,
      bucketId,
      user.mnemonic,
      {
        pass: user.userId,
        user: user.bridgeUser,
      },
      {
        toPath: downloadPath,
        downloadProgressCallback: downloadProgressCallback ? downloadProgressCallback : noop,
        decryptionProgressCallback: decryptionProgressCallback ? decryptionProgressCallback : noop,
        onEncryptedFileDownloaded: async ({ path, name }) => {
          if (!disableCache) {
            await driveFileCache.cacheFile(path, name);
          }
        },
        signal,
      },
      fileSize,
      (abortable) => {
        if (onAbortableReady) {
          onAbortableReady(abortable);
        }
      },
    );

    return {
      downloadPath,
    };
  }

  /**
   * Obtain a path to store the decrypted file
   *
   * @param filename Filename of the file to download
   * @returns A path to store the decrypted file
   */
  getDecryptedFilePath(filename: string, type?: string) {
    // Use a tmp file so the decrypted file is not persisted
    return fs.tmpFilePath(filename + (type ? `.${type}` : ''));
  }

  /**
   *
   * @param filename Filename of the file to check
   * @returns If the file exists decrypted in the filesystem
   */
  async existsDecrypted(filename: string, type?: string) {
    const path = this.getDecryptedFilePath(filename, type);
    const exists = await fs.exists(path);
    if (!exists) return false;
    const stat = await fs.statRNFS(path);
    return exists && stat.size !== 0;
  }

  getName(filename: string, type?: string) {
    return filename + (type ? `.${type}` : '');
  }

  public async checkFileExistence(parentFolderUuid: string, filesList: { plainName: string; type: string }[]) {
    return this.sdk.storageV2.checkDuplicatedFiles({ folderUuid: parentFolderUuid, filesList });
  }
}

export const driveFileService = new DriveFileService(SdkManager.getInstance());
