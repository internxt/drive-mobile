import { logger } from '@internxt-mobile/services/common';
import pLimit from 'p-limit';
import { FolderTree, FolderTreeNode, FolderUploadResult, UploadFileCallback } from '../../../types/drive/folderUpload';
import { HTTP_CONFLICT, HTTP_NOT_FOUND } from '../../common/httpStatusCodes';
import { driveFolderService } from './driveFolder.service';

const FOLDER_UPLOAD_CONCURRENCY = 3;
const TAG = '[FolderOrchestration]';

const FOLDER_CREATE_RETRY_DELAYS_MS = [500, 1000, 2000];
const PATH_SEPARATOR_REGEX = /\//g;

export interface UploadFolderContentsParams {
  tree: FolderTree;
  rootParentUuid: string;
  signal: AbortSignal;
  onProgress: (uploadedFiles: number, failedFiles: number) => void;
  uploadFile: UploadFileCallback;
}

/**
 * Creates a folder under `parentUuid`, returning its UUID.
 * - **409 Conflict**: merges transparently, returning the existing UUID.
 * - **404 Not Found**: retries with exponential backoff ({@link FOLDER_CREATE_RETRY_DELAYS_MS}).
 * - Any other error is rethrown immediately.
 */
export const createFolderWithMerge = async (parentUuid: string, folderName: string): Promise<string> => {
  let lastError: unknown;

  for (let attempt = 0; attempt <= FOLDER_CREATE_RETRY_DELAYS_MS.length; attempt++) {
    try {
      const folder = await driveFolderService.createFolder(parentUuid, folderName);
      logger.info(TAG, `Created folder "${folderName}" - ${folder.uuid}`);
      return folder.uuid;
    } catch (error) {
      const httpError = error as { status?: number; statusCode?: number; message?: string };
      const status = httpError?.status ?? httpError?.statusCode;
      const isConflict = status === HTTP_CONFLICT;

      if (isConflict) {
        logger.info(TAG, `Folder "${folderName}" already exists — merging`);
        const { existentFolders } = await driveFolderService.checkDuplicatedFolders(parentUuid, [folderName]);
        if (existentFolders[0]?.uuid) {
          return existentFolders[0].uuid;
        }
        throw new Error(`Folder "${folderName}" conflict but not found in parent ${parentUuid}`);
      }

      const isNotFound = status === HTTP_NOT_FOUND;
      const delayMs = FOLDER_CREATE_RETRY_DELAYS_MS[attempt];
      if (isNotFound && delayMs !== undefined) {
        logger.warn(TAG, `Folder "${folderName}" parent not ready (404) — retrying in ${delayMs}ms`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        lastError = error;
        continue;
      }

      throw error;
    }
  }

  throw lastError;
};

/**
 * Returns the maximum nesting depth across `dirs`, or `0` if empty.
 */
export const getMaxDepth = (dirs: FolderTreeNode[]): number => {
  if (dirs.length === 0) return 0;
  return dirs.reduce((max, dir) => {
    const depth = (dir.relativePath.match(PATH_SEPARATOR_REGEX) ?? []).length + 1;
    return Math.max(max, depth);
  }, 0);
};

/**
 * Orchestrates concurrent folder creation and parallel file uploads.
 * Expects `tree` in depth-first pre-order.
 * - Each folder's `Promise<uuid>` chains only to its parent.
 * - Files upload with max concurrency of 3, each awaiting only its parent's Promise.
 * - Individual failures don't abort the rest.
 * - `signal` is checked at each checkpoint for responsive cancellation.
 *
 * @returns Counts of uploaded/failed files and folders, plus cancellation flag.
 */
export const uploadFolderContents = async ({
  tree,
  rootParentUuid,
  signal,
  onProgress,
  uploadFile,
}: UploadFolderContentsParams): Promise<FolderUploadResult> => {
  const totalFiles = tree.files.length;
  const totalFolders = tree.dirs.length;

  let createdFolders = 0;
  let failedFolders = 0;

  const folderCreationPromises = new Map<string, Promise<string>>();
  folderCreationPromises.set('', Promise.resolve(rootParentUuid));

  for (const directory of tree.dirs) {
    const parentPromise = folderCreationPromises.get(directory.parentPath);
    if (!parentPromise) {
      logger.warn(TAG, `Missing parent promise for "${directory.relativePath}" — skipping subtree`);
      failedFolders++;
      folderCreationPromises.set(
        directory.relativePath,
        Promise.reject(new Error(`Parent not found: ${directory.parentPath}`)),
      );
      continue;
    }
    const folderPromise = parentPromise.then(async (parentUuid) => {
      if (signal.aborted) throw new DOMException('Upload cancelled', 'AbortError');
      const uuid = await createFolderWithMerge(parentUuid, directory.name);
      createdFolders++;
      return uuid;
    });
    folderPromise.catch((err) => {
      if ((err as Error)?.name !== 'AbortError') failedFolders++;
    });
    folderCreationPromises.set(directory.relativePath, folderPromise);
  }

  if (totalFiles === 0) {
    await Promise.allSettled(folderCreationPromises.values());
    return {
      totalFiles: 0,
      uploadedFiles: 0,
      failedFiles: 0,
      totalFolders,
      createdFolders,
      failedFolders,
      cancelled: signal.aborted,
    };
  }

  let uploadedFiles = 0;
  let failedFiles = 0;
  let wasCancelled = false;
  const uploadLimit = pLimit(FOLDER_UPLOAD_CONCURRENCY);

  await Promise.allSettled(
    tree.files.map((file) =>
      uploadLimit(async () => {
        if (signal.aborted) {
          wasCancelled = true;
          return;
        }

        const parentPromise = folderCreationPromises.get(file.parentPath);
        if (!parentPromise) {
          logger.error(TAG, `No parent promise for file "${file.relativePath}" — skipping`);
          failedFiles++;
          onProgress(uploadedFiles, failedFiles);
          return;
        }

        try {
          const parentUuid = await parentPromise;
          if (signal.aborted) {
            wasCancelled = true;
            return;
          }

          await uploadFile(file, parentUuid, signal);
          uploadedFiles++;
          logger.info(TAG, `created: "${file.relativePath}" (${uploadedFiles}/${totalFiles})`);
        } catch (err) {
          const error = err as Error;
          if (error.name === 'AbortError') {
            wasCancelled = true;
          } else {
            failedFiles++;
            logger.error(TAG, `failed creation: "${file.relativePath}": ${error.message}`);
          }
        }

        onProgress(uploadedFiles, failedFiles);
      }),
    ),
  );

  return {
    totalFiles,
    uploadedFiles,
    failedFiles,
    totalFolders,
    createdFolders,
    failedFolders,
    cancelled: wasCancelled,
  };
};
