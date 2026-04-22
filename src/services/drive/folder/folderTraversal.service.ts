import * as RNFS from '@dr.pogodin/react-native-fs';
import { getInfoAsync, StorageAccessFramework } from 'expo-file-system/legacy';
import { Alert } from 'react-native';
import strings from '../../../../assets/lang/strings';
import { FolderTree, FolderTreeNode } from '../../../types/drive/folderUpload';
import { getNameFromSafUri, SAF_VOLUME_PREFIX_RE } from './utils/safUri';

const MAX_FILES = 3000;

export class FolderTooLargeError extends Error {
  constructor() {
    super(`Folder contains more than ${MAX_FILES} files`);
    this.name = 'FolderTooLargeError';
  }
}

type TraverseContext = {
  dirPath: string;
  rootPath: string;
  result: FolderTree;
  fileCount: number;
};

const traverseFileUri = async ({ dirPath, rootPath, result, fileCount }: TraverseContext): Promise<number> => {
  const items = await RNFS.readDir(dirPath);

  for (const item of items) {
    const isDirectory = item.isDirectory();
    const relativePath = item.path.slice(rootPath.length + 1);
    const parentPath = relativePath.includes('/') ? relativePath.slice(0, relativePath.lastIndexOf('/')) : '';

    const node: FolderTreeNode = {
      relativePath,
      parentPath,
      name: item.name,
      isDirectory,
      size: isDirectory ? 0 : Number(item.size),
      uri: `file://${item.path}`,
    };

    if (isDirectory) {
      result.dirs.push(node);
      fileCount = await traverseFileUri({ dirPath: item.path, rootPath, result, fileCount });
    } else {
      fileCount++;
      if (fileCount > MAX_FILES) {
        Alert.alert(
          strings.errors.folderTooLarge.title,
          strings.formatString(strings.errors.folderTooLarge.message, MAX_FILES.toLocaleString()),
        );
        throw new FolderTooLargeError();
      }
      result.files.push(node);
    }
  }

  return fileCount;
};

/**
 * Traverses SAF child URIs recursively.
 *
 * Each child gets exactly one readDirectoryAsync call:
 * - Resolves → directory; the returned list is reused directly for recursion.
 * - Throws   → file.
 *
 * Checks signal.aborted before each item so cancellation takes effect within one loop tick.
 */
const traverseSafChildren = async (
  childUris: string[],
  currentRelativePath: string,
  result: FolderTree,
  fileCount: number,
  signal?: AbortSignal,
): Promise<number> => {
  for (const childUri of childUris) {
    if (signal?.aborted) throw new DOMException('Folder scan cancelled', 'AbortError');

    const info = await getInfoAsync(childUri).catch(() => ({ exists: false as const }));
    const infoName = (info as { name?: string }).name;
    const useInfoName = infoName != null && !SAF_VOLUME_PREFIX_RE.test(infoName);
    const name = useInfoName ? infoName : getNameFromSafUri(childUri);

    const relativePath = currentRelativePath ? `${currentRelativePath}/${name}` : name;
    const parentPath = currentRelativePath;

    let grandchildUris: string[];
    try {
      grandchildUris = await StorageAccessFramework.readDirectoryAsync(childUri);
    } catch {
      const size = (info as { size?: number }).size ?? 0;
      fileCount++;
      if (fileCount > MAX_FILES) {
        Alert.alert(
          strings.errors.folderTooLarge.title,
          strings.formatString(strings.errors.folderTooLarge.message, MAX_FILES.toLocaleString()),
        );
        throw new FolderTooLargeError();
      }
      result.files.push({ relativePath, parentPath, name, isDirectory: false, size, uri: childUri });
      continue;
    }

    result.dirs.push({ relativePath, parentPath, name, isDirectory: true, size: 0, uri: childUri });
    fileCount = await traverseSafChildren(grandchildUris, relativePath, result, fileCount, signal);
  }

  return fileCount;
};

/**
 * Traverses a folder URI and returns all dirs and files separated.
 * Dirs are collected in DFS pre-order so each parent is always listed before its children.
 *
 * @param uri - The folder URI to traverse
 * @returns An object with all discovered dirs and files as {@link FolderTreeNode} entries.
 * @throws {FolderTooLargeError} When the folder contains more than {@link MAX_FILES} files.
 * @throws {Error} When the URI scheme is not supported.
 */
const traverseFolder = async (uri: string, signal?: AbortSignal): Promise<FolderTree> => {
  if (uri.startsWith('file://')) {
    const rootPath = decodeURIComponent(uri.replace('file://', '').replace(/\/$/, ''));
    const result: FolderTree = { dirs: [], files: [] };
    await traverseFileUri({ dirPath: rootPath, rootPath, result, fileCount: 0 });
    return result;
  }

  if (uri.startsWith('content://')) {
    const result: FolderTree = { dirs: [], files: [] };
    const rootChildUris = await StorageAccessFramework.readDirectoryAsync(uri);
    await traverseSafChildren(rootChildUris, '', result, 0, signal);
    return result;
  }

  throw new Error(`Unsupported URI scheme: ${uri}`);
};

export const folderTraversalService = {
  traverseFolder,
};
