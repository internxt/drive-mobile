import { createHash } from 'crypto';
import axios from 'axios';

import { DriveItemData, DriveListItem, SortDirection, SortType } from '../types/drive';
import { getHeaders } from '../helpers/headers';
import { constants } from './AppService';
import { FetchFolderContentResponse, MoveFilePayload, MoveFileResponse, UpdateFilePayload } from '@internxt/sdk/dist/drive/storage/types';
import { SdkManager } from './common/SdkManager';

export type ArraySortFunction = (a: DriveListItem, b: DriveListItem) => number;

class DriveFileService {
  private sdk: SdkManager;

  constructor(sdk: SdkManager) {
    this.sdk = sdk;
  }

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

  public async getFolderContent(folderId: number): Promise<FetchFolderContentResponse> {
    const sdkResult = this.sdk.storage.getFolderContent(folderId);
    return sdkResult[0];
  }

  public async updateMetaData(UpdateFilePayload: UpdateFilePayload): Promise<void> {
    const hashedRelativePath = createHash('ripemd160').update(UpdateFilePayload.destinationPath).digest('hex');

    const params = {
      fileId: UpdateFilePayload.fileId,
      metadata: UpdateFilePayload.metadata,
      bucketId: UpdateFilePayload.bucketId,
      destinationPath: hashedRelativePath,
    };

    return this.sdk.storage.updateFile(params);
  }

  public async moveFile(moveFilePayload: MoveFilePayload): Promise<MoveFileResponse> {
    return this.sdk.storage.moveFile(moveFilePayload);
  }

  public async deleteItems(items: DriveItemData[]): Promise<unknown> {
    for (const item of items) {
      const deleteFiles = {
        fileId: item.id,
        folderId: item.folderId,
      };
      const isFolder = !item.fileId;

      const itemsDeleted: unknown = isFolder
        ? this.sdk.storage.deleteFolder(item.id)
        : this.sdk.storage.deleteFile(deleteFiles);

      return itemsDeleted;
    }
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
              const aName = a.data.name.toLowerCase();
              const bName = b.data.name.toLowerCase();

              return aName < bName ? -1 : aName > bName ? 1 : 0;
            }
            : (a: DriveListItem, b: DriveListItem) => {
              const aName = a.data.name.toLowerCase();
              const bName = b.data.name.toLowerCase();

              return aName < bName ? 1 : aName > bName ? -1 : 0;
            };
        break;
      case SortType.Size:
        sortFunction =
          direction === SortDirection.Asc
            ? (a: DriveListItem, b: DriveListItem) => {
              return a.data?.size || 0 > (b.data?.size || 0) ? 1 : -1;
            }
            : (a: DriveListItem, b: DriveListItem) => {
              return (a.data?.size || 0) < (b.data?.size || 0) ? 1 : -1;
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

  public async renameFileInNetwork(fileId: string, bucketId: string, relativePath: string): Promise<void> {
    const hashedRelativePath = createHash('ripemd160').update(relativePath).digest('hex');
    const headers = await getHeaders();
    const headersMap: Record<string, string> = {};

    headers.forEach((value: string, key: string) => {
      headersMap[key] = value;
    });

    await axios.post<{ message: string }>(
      `${constants.REACT_NATIVE_DRIVE_API_URL}/api/storage/rename-file-in-network`,
      {
        fileId,
        bucketId,
        relativePath: hashedRelativePath,
      },
      { headers: headersMap },
    );
  }
}

const driveFileService = new DriveFileService(SdkManager.getInstance());
export default driveFileService;
