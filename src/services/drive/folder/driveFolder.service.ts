import asyncStorageService from '@internxt-mobile/services/AsyncStorageService';
import { SdkManager } from '@internxt-mobile/services/common';
import { AsyncStorageKey } from '@internxt-mobile/types/index';
import { FolderAncestor as SdkFolderAncestor } from '@internxt/sdk/dist/drive/storage/types';
import { getHeaders } from '../../../helpers/headers';
import { DriveFileData } from '../../../types/drive/file';
import { ModifiedFolder } from '../../../types/drive/folder';
import { constants } from '../../AppService';

export type FolderAncestor = SdkFolderAncestor & { parentUuid: string | null };

/** Max `folderUuids` the delta endpoint accepts per call — the most days a month can have. */
export const FOLDER_DELTA_MAX_FOLDER_UUIDS = 31;

export interface FolderDeltaChangesParams {
  /** Day-folder uuids to ask changes for. At most `FOLDER_DELTA_MAX_FOLDER_UUIDS`. */
  folderUuids: string[];
  /** ISO8601. Files changed after this instant. Required unless `cursor` is given. */
  updatedAt?: string;
  /** Opaque cursor from a previous page's `nextCursor`. */
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

  public async getFolderFiles(folderId: string, offset: number, limit: number) {
    const [promise] = this.sdk.storageV2.getFolderFilesByUuid(folderId, offset, limit, 'plainName', 'ASC');

    return promise;
  }

  public async getFolderFolders(folderId: string, offset: number, limit: number) {
    const [promise] = this.sdk.storageV2.getFolderFoldersByUuid(folderId, offset, limit, 'plainName', 'ASC');

    return promise;
  }

  public async createFolder(parentFolderId: string, folderName: string) {
    const sdkResult = this.sdk.storageV2.createFolderByUuid({
      parentFolderUuid: parentFolderId,
      plainName: folderName,
    });
    return sdkResult ? sdkResult[0] : Promise.reject('createFolder Sdk method did not return a valid result');
  }

  public async checkDuplicatedFolders(parentFolderUuid: string, folderNamesList: string[]) {
    return this.sdk.storageV2.checkDuplicatedFolders({ folderUuid: parentFolderUuid, folderNamesList });
  }

  public async moveFolder({
    destinationFolderUuid,
    folderUuid,
  }: {
    folderUuid: string;
    destinationFolderUuid: string;
  }) {
    return this.sdk.storageV2.moveFolderByUuid(folderUuid, { destinationFolder: destinationFolderUuid });
  }

  public async updateMetaData(folderUuid: string, newName: string): Promise<void> {
    await this.sdk.storageV2.updateFolderNameWithUUID({
      folderUuid,
      name: newName,
    });
  }

  public async getFolderAncestors(folderUuid: string): Promise<FolderAncestor[]> {
    return this.sdk.storageV2.getFolderAncestors(folderUuid) as Promise<FolderAncestor[]>;
  }

  public getFolderContentByUuid(folderUuid: string, offset?: number, limit?: number) {
    const [contentPromise] = this.sdk.storageV2.getFolderContentByUuid({ folderUuid, offset, limit });
    return contentPromise;
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
    status: 'ALL' | 'TRASHED' | 'REMOVED';
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
