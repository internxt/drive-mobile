import { useDrive } from '@internxt-mobile/hooks/drive';
import errorService from '@internxt-mobile/services/ErrorService';
import { DriveItemData } from '@internxt-mobile/types/drive/item';
import { DrivePreviewSourceFolder } from '@internxt-mobile/types/navigation';
import { useEffect, useMemo } from 'react';
import { canLoadNextPage, getFolderPreviewFiles } from '../../DriveFolderScreen/DriveFolderScreen.helpers';
import { useLoadNextFolderPage } from '../../DriveFolderScreen/useLoadNextFolderPage';

const NEXT_PAGE_PRELOAD_THRESHOLD = 3;

type LoadMorePreviewFilesParams = {
  sourceFolder?: DrivePreviewSourceFolder;
  activeIndex: number;
  previewFiles: DriveItemData[];
  removedFileUuids: ReadonlySet<string>;
  appendFiles: (files: DriveItemData[]) => void;
};

/**
 * Appends the files of the source folder that the preview does not hold nor removed, and loads the next page of that
 * folder when the active file is near the end of the files loaded.
 */
export const useLoadMorePreviewFiles = ({
  sourceFolder,
  activeIndex,
  previewFiles,
  removedFileUuids,
  appendFiles,
}: LoadMorePreviewFilesParams): void => {
  const driveCtx = useDrive();
  const { loadNextPage } = useLoadNextFolderPage(sourceFolder?.folderUuid);
  const folderNode = sourceFolder ? driveCtx.driveFoldersTree[sourceFolder.folderUuid] : undefined;
  const folderFiles = folderNode?.files;
  const searchValue = sourceFolder?.searchValue;

  const folderPreviewFiles = useMemo(
    () =>
      folderFiles && searchValue !== undefined
        ? getFolderPreviewFiles(folderFiles, driveCtx.sortMode, searchValue)
        : [],
    [folderFiles, driveCtx.sortMode, searchValue],
  );
  const previewUuids = useMemo(() => new Set(previewFiles.map((previewFile) => previewFile.uuid)), [previewFiles]);
  const missingFiles = useMemo(
    () => folderPreviewFiles.filter((file) => !previewUuids.has(file.uuid) && !removedFileUuids.has(file.uuid)),
    [folderPreviewFiles, previewUuids, removedFileUuids],
  );

  useEffect(() => {
    if (missingFiles.length > 0) {
      appendFiles(missingFiles);
    }
  }, [missingFiles]);

  useEffect(() => {
    const loadedFilesCount = previewFiles.length + missingFiles.length;
    const isNearEnd = activeIndex >= loadedFilesCount - NEXT_PAGE_PRELOAD_THRESHOLD;
    if (!sourceFolder || !isNearEnd || !canLoadNextPage(folderNode)) {
      return;
    }

    loadNextPage().catch((error) => errorService.reportError(error));
  }, [activeIndex, previewFiles.length, missingFiles.length, folderNode]);
};
