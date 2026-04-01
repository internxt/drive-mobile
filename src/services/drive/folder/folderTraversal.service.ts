import * as RNFS from '@dr.pogodin/react-native-fs';
import { getInfoAsync, StorageAccessFramework } from 'expo-file-system/legacy';
import { Alert } from 'react-native';
import strings from '../../../../assets/lang/strings';
import { FolderTree, FolderTreeNode } from '../../../types/drive/folderUpload';

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

type SAFTraverseContext = {
  dirUri: string;
  currentRelativePath: string;
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

const getNameFromSafUri = (childUri: string): string => {
  const documentPart = childUri.split('/document/').pop() ?? '';
  const decoded = decodeURIComponent(documentPart);
  return decoded.split('/').pop() ?? decoded;
};

const traverseSafUri = async ({
  dirUri,
  currentRelativePath,
  result,
  fileCount,
}: SAFTraverseContext): Promise<number> => {
  const childUris = await StorageAccessFramework.readDirectoryAsync(dirUri);

  for (const childUri of childUris) {
    const info = await getInfoAsync(childUri);
    const infoName = (info as typeof info & { name?: string }).name;
    const name = infoName || getNameFromSafUri(childUri);
    const isDirectory = info.exists ? info.isDirectory : false;
    const relativePath = currentRelativePath ? `${currentRelativePath}/${name}` : name;
    const parentPath = currentRelativePath;

    const node: FolderTreeNode = {
      relativePath,
      parentPath,
      name,
      isDirectory,
      size: isDirectory || !info.exists ? 0 : info.size,
      uri: childUri,
    };

    if (isDirectory) {
      result.dirs.push(node);
      fileCount = await traverseSafUri({ dirUri: childUri, currentRelativePath: relativePath, result, fileCount });
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
 * Traverses a folder URI and returns all dirs and files separated.
 * Dirs are collected in DFS pre-order so each parent is always listed before its children.
 *
 * @param uri - The folder URI to traverse
 * @returns An object with all discovered dirs and files as {@link FolderTreeNode} entries.
 * @throws {FolderTooLargeError} When the folder contains more than {@link MAX_FILES} files.
 * @throws {Error} When the URI scheme is not supported.
 */
const traverseFolder = async (uri: string): Promise<FolderTree> => {
  if (uri.startsWith('file://')) {
    const rootPath = decodeURIComponent(uri.replace('file://', '').replace(/\/$/, ''));
    const result: FolderTree = { dirs: [], files: [] };
    await traverseFileUri({ dirPath: rootPath, rootPath, result, fileCount: 0 });
    return result;
  }

  if (uri.startsWith('content://')) {
    const result: FolderTree = { dirs: [], files: [] };
    await traverseSafUri({ dirUri: uri, currentRelativePath: '', result, fileCount: 0 });
    return result;
  }

  throw new Error(`Unsupported URI scheme: ${uri}`);
};

export const folderTraversalService = {
  traverseFolder,
};
