import asyncStorageService from '@internxt-mobile/services/AsyncStorageService';
import { SdkManager } from '@internxt-mobile/services/common';
import { DEFAULT_SORT_MODE, SortDirection, SortMode, SortType } from '@internxt-mobile/types/drive/ui';
import { AsyncStorageKey } from '@internxt-mobile/types/index';
import { getHeaders } from '../../../helpers/headers';
import {
  CheckDuplicatedFoldersResponse,
  CreateFolderResponse,
  FetchFolderContentResponse,
  FetchPaginatedFoldersContent,
  FolderAncestor,
  FolderMeta,
  ModifiedFolder,
} from '../../../types/drive/folder';
import { DriveFileData, FetchPaginatedFilesContent } from '../../../types/drive/file';
import { constants } from '../../AppService';
import { notifyParentChanged } from '../../native/InternxtSignalingModule';

type SortOrder = 'ASC' | 'DESC';
type SortQuery = { field: string; order: SortOrder };

const SORT_FIELD_BY_TYPE: Record<SortType, string> = {
  [SortType.Name]: 'plainName',
  [SortType.Size]: 'size',
  [SortType.UpdatedAt]: 'updatedAt',
};

const FOLDERS_SORT_WHEN_SORTING_BY_SIZE: SortQuery = { field: 'plainName', order: 'ASC' };

const getSortOrder = ({ type, direction }: SortMode): SortOrder => {
  const isAscendingDirection = direction === SortDirection.Asc;
  const isAscendingSortOrder = type === SortType.UpdatedAt ? !isAscendingDirection : isAscendingDirection;
  return isAscendingSortOrder ? 'ASC' : 'DESC';
};

const getFilesSortQuery = (sortMode: SortMode): SortQuery => ({
  field: SORT_FIELD_BY_TYPE[sortMode.type],
  order: getSortOrder(sortMode),
});

const getFoldersSortQuery = (sortMode: SortMode): SortQuery =>
  sortMode.type === SortType.Size ? FOLDERS_SORT_WHEN_SORTING_BY_SIZE : getFilesSortQuery(sortMode);

/** Max `folderUuids` the delta endpoint accepts per call — the most days a month can have. */
export const FOLDER_DELTA_MAX_FOLDER_UUIDS = 31;

export interface FolderDeltaChangesParams {
  /** Day-folder uuids to ask changes for. At most `FOLDER_DELTA_MAX_FOLDER_UUIDS`. */
  folderUuids: string[];
  updatedAt?: string;
  cursor?: string;
  /** Page size, max 1000. */
  limit?: number;
}

export interface FolderDeltaChangesPage {
  files: DriveFileData[];
  nextCursor: string | null;
}

/**
 * Rewrites a delta file into the shape the rest of the app expects. The delta endpoint serializes
 * thumbnail fields in camelCase while every other file endpoint uses snake_case, so without this
 * every thumbnail reference read off a delta file resolves to undefined. Either spelling is
 * accepted, so the endpoint aligning with the others later does not break this.
 */
const normalizeDeltaFile = (file: DriveFileData): DriveFileData => {
  const thumbnails = (file.thumbnails ?? []) as unknown as Record<string, unknown>[];
  return {
    ...file,
    thumbnails: thumbnails.map((thumbnail) => ({
      id: thumbnail.id,
      file_id: thumbnail.file_id ?? thumbnail.fileId,
      type: thumbnail.type,
      size: thumbnail.size,
      bucket_id: thumbnail.bucket_id ?? thumbnail.bucketId,
      bucket_file: thumbnail.bucket_file ?? thumbnail.bucketFile,
      encrypt_version: thumbnail.encrypt_version ?? thumbnail.encryptVersion,
      max_width: thumbnail.max_width ?? thumbnail.maxWidth,
      max_height: thumbnail.max_height ?? thumbnail.maxHeight,
      createdAt: thumbnail.createdAt,
    })),
  } as DriveFileData;
};

class DriveFolderService {
  private sdk: SdkManager;

  constructor(sdk: SdkManager) {
    this.sdk = sdk;
  }

  public async getFolderFiles(
    folderId: string,
    offset: number,
    limit: number,
    sortMode = DEFAULT_SORT_MODE,
  ): Promise<FetchPaginatedFilesContent> {
    const { field, order } = getFilesSortQuery(sortMode);
    const [promise] = this.sdk.storageV2.getFolderFilesByUuid(folderId, offset, limit, field, order);

    return promise;
  }

  public async getFolderFolders(
    folderId: string,
    offset: number,
    limit: number,
    sortMode = DEFAULT_SORT_MODE,
  ): Promise<FetchPaginatedFoldersContent> {
    const { field, order } = getFoldersSortQuery(sortMode);
    const [promise] = this.sdk.storageV2.getFolderFoldersByUuid(folderId, offset, limit, field, order);

    return promise;
  }

  public async createFolder(parentFolderId: string, folderName: string): Promise<CreateFolderResponse> {
    const sdkResult = this.sdk.storageV2.createFolderByUuid({
      parentFolderUuid: parentFolderId,
      plainName: folderName,
    });
    if (!sdkResult) {
      throw new Error('Sdk method did not return a valid result');
    }
    const folder = await sdkResult[0];
    void notifyParentChanged(parentFolderId);
    return folder;
  }

  public async checkDuplicatedFolders(
    parentFolderUuid: string,
    folderNamesList: string[],
  ): Promise<CheckDuplicatedFoldersResponse> {
    return this.sdk.storageV2.checkDuplicatedFolders({
      folderUuid: parentFolderUuid,
      folderNamesList,
    }) as Promise<CheckDuplicatedFoldersResponse>;
  }

  public async moveFolder({
    destinationFolderUuid,
    folderUuid,
  }: {
    folderUuid: string;
    destinationFolderUuid: string;
  }): Promise<FolderMeta> {
    const moved = await this.sdk.storageV2.moveFolderByUuid(folderUuid, { destinationFolder: destinationFolderUuid });
    void notifyParentChanged(destinationFolderUuid);
    return moved;
  }

  public async updateMetaData(folderUuid: string, newName: string): Promise<void> {
    await this.sdk.storageV2.updateFolderNameWithUUID({
      folderUuid,
      name: newName,
    });
  }

  public async getFolderAncestors(folderUuid: string): Promise<FolderAncestor[]> {
    return this.sdk.storageV2.getFolderAncestors(folderUuid);
  }

  public getFolderContentByUuid(
    folderUuid: string,
    offset?: number,
    limit?: number,
  ): Promise<FetchFolderContentResponse> {
    const [contentPromise] = this.sdk.storageV2.getFolderContentByUuid({ folderUuid, offset, limit });
    return contentPromise as Promise<FetchFolderContentResponse>;
  }

  public async getModifiedFolders({
    limit = 50,
    offset = 0,
    updatedAt,
    status,
  }: {
    limit?: number;
    offset?: number;
    updatedAt: string;
    status: 'ALL' | 'EXISTS' | 'TRASHED' | 'DELETED';
  }): Promise<ModifiedFolder[] | undefined> {
    const updatedAtDate = updatedAt && `&updatedAt=${updatedAt}`;
    const query = `status=${status}&offset=${offset}&limit=${limit}${updatedAtDate}`;
    const newToken = await asyncStorageService.getItem(AsyncStorageKey.PhotosToken);

    if (!newToken) return;

    const headers = await getHeaders(newToken);

    const modifiedItems = await fetch(`${constants.DRIVE_NEW_API_URL}/folders?${query}`, {
      method: 'GET',
      headers,
    });

    const parsedModifiedFolders = await modifiedItems.json();

    return parsedModifiedFolders;
  }

  /**
   * Fetches one page of files changed inside the given day folders since `updatedAt`.
   *
   * Returns a single page — the caller loops on `nextCursor` until it comes back `null`. The
   * endpoint is not exposed by the SDK, so it goes through `fetch` like `getModifiedFolders`.
   *
   * @param params.folderUuids - Day-folder uuids to ask changes for, at most
   *   `FOLDER_DELTA_MAX_FOLDER_UUIDS`.
   * @param params.updatedAt - ISO8601 instant to fetch changes from. Required unless `cursor` is
   *   given.
   * @param params.cursor - Opaque cursor from the previous page's `nextCursor`.
   * @param params.limit - Page size, max 1000.
   * @returns The page's files and the cursor for the next one, `null` when there are no more.
   */
  public async getFolderDeltaChanges({
    folderUuids,
    updatedAt,
    cursor,
    limit,
  }: FolderDeltaChangesParams): Promise<FolderDeltaChangesPage> {
    const token = await asyncStorageService.getItem(AsyncStorageKey.PhotosToken);
    if (!token) {
      throw new Error('getFolderDeltaChanges: no photos token available');
    }

    const headers = await getHeaders(token);
    const response = await fetch(`${constants.DRIVE_NEW_API_URL}/photos/folders/files/delta/search`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ folderUuids, updatedAt, cursor, limit }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`getFolderDeltaChanges: HTTP ${response.status} — ${body}`);
    }

    const page = (await response.json()) as FolderDeltaChangesPage;
    return { ...page, files: page.files.map(normalizeDeltaFile) };
  }
}

export const driveFolderService = new DriveFolderService(SdkManager.getInstance());
