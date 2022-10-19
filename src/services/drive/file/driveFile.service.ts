import { createHash } from 'crypto';
import axios from 'axios';

import { DriveFileMetadataPayload, DriveItemData, DriveListItem, SortDirection, SortType } from '../../../types/drive';
import { getHeaders } from '../../../helpers/headers';
import { constants } from '../../AppService';
import { FetchFolderContentResponse, MoveFileResponse, Thumbnail } from '@internxt/sdk/dist/drive/storage/types';
import { getEnvironmentConfig } from 'src/lib/network';
import network from 'src/network';
import { DRIVE_THUMBNAILS_DIRECTORY } from '../constants';
import fileSystemService from '@internxt-mobile/services/FileSystemService';

export type ArraySortFunction = (a: DriveListItem, b: DriveListItem) => number;

class DriveFileService {
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
    const headers = await getHeaders();
    const headersMap: Record<string, string> = {};

    headers.forEach((value: string, key: string) => {
      headersMap[key] = value;
    });

    const response = await axios.get<FetchFolderContentResponse>(
      `${constants.DRIVE_API_URL}/storage/v2/folder/${folderId}`,
      {
        headers: headersMap,
      },
    );

    return response.data;
  }

  public async updateMetaData(
    fileId: string,
    metadata: DriveFileMetadataPayload,
    bucketId: string,
    relativePath: string,
  ): Promise<void> {
    const hashedRelativePath = createHash('ripemd160').update(relativePath).digest('hex');
    const headers = await getHeaders();
    const headersMap: Record<string, string> = {};

    headers.forEach((value: string, key: string) => {
      headersMap[key] = value;
    });

    return axios
      .post(
        `${constants.DRIVE_API_URL}/storage/file/${fileId}/meta`,
        {
          metadata,
          bucketId,
          relativePath: hashedRelativePath,
        },
        { headers: headersMap },
      )
      .then(() => undefined);
  }

  public async moveFile(moveFilePayload: { fileId: string; destination: number }): Promise<MoveFileResponse> {
    const headers = await getHeaders();
    const data = JSON.stringify(moveFilePayload);

    const res = await fetch(`${constants.DRIVE_API_URL}/storage/move/file`, {
      method: 'POST',
      headers,
      body: data,
    });

    return res.json();
  }

  public async deleteItems(items: DriveItemData[]): Promise<void> {
    const fetchArray: Promise<Response>[] = [];

    for (const item of items) {
      const isFolder = !item.fileId;
      const headers = await getHeaders();
      const url = isFolder
        ? `${constants.DRIVE_API_URL}/storage/folder/${item.id}`
        : `${constants.DRIVE_API_URL}/storage/bucket/${item.bucket}/file/${item.fileId}`;

      const fetchObj = fetch(url, {
        method: 'DELETE',
        headers,
      });

      fetchArray.push(fetchObj);
    }

    return Promise.all(fetchArray).then(() => undefined);
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
                const aName = Buffer.from(a.data.name.trim().toLowerCase()).toString('hex');
                const bName = Buffer.from(b.data.name.trim().toLowerCase()).toString('hex');

                return aName < bName ? -1 : aName > bName ? 1 : 0;
              }
            : (a: DriveListItem, b: DriveListItem) => {
                const aName = Buffer.from(a.data.name.trim().toLowerCase()).toString('hex');
                const bName = Buffer.from(b.data.name.trim().toLowerCase()).toString('hex');

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

  public async getThumbnail(thumbnail: Thumbnail) {
    const { bridgeUser, bridgePass, encryptionKey } = await getEnvironmentConfig();
    const destination = `${DRIVE_THUMBNAILS_DIRECTORY}/${thumbnail.bucket_file}.${thumbnail.type}`;

    if (await fileSystemService.exists(destination)) {
      return destination;
    }
    await network.downloadFile(
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

    return destination;
  }

  public async renameFileInNetwork(fileId: string, bucketId: string, relativePath: string): Promise<void> {
    const hashedRelativePath = createHash('ripemd160').update(relativePath).digest('hex');
    const headers = await getHeaders();
    const headersMap: Record<string, string> = {};

    headers.forEach((value: string, key: string) => {
      headersMap[key] = value;
    });

    await axios.post<{ message: string }>(
      `${constants.DRIVE_API_URL}/storage/rename-file-in-network`,
      {
        fileId,
        bucketId,
        relativePath: hashedRelativePath,
      },
      { headers: headersMap },
    );
  }
}

export const driveFileService = new DriveFileService();
