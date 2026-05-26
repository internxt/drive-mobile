import type { Dispatch } from 'redux';
import { notifyFilesExcludedBySize } from '../../file/utils/fileSizeErrors';
import { FolderTree, FolderTreeNode } from '../../../../types/drive/folderUpload';

/**
 * Removes files exceeding `maxUploadFileSize` from `tree.files` in place and
 * notifies the user. `maxUploadFileSize <= 0` means unlimited/unknown — skip.
 */
export const filterOversizedFromTree = (
  tree: FolderTree,
  maxUploadFileSize: number,
  dispatch: Dispatch,
): FolderTreeNode[] => {
  if (maxUploadFileSize <= 0) return [];
  const oversizedFiles = tree.files.filter((file) => file.size > maxUploadFileSize);
  if (oversizedFiles.length === 0) return [];
  notifyFilesExcludedBySize(oversizedFiles, dispatch);
  tree.files = tree.files.filter((file) => file.size <= maxUploadFileSize);
  return oversizedFiles;
};
