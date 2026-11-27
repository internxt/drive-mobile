import { startFilePreview } from '@internxt-mobile/hooks/drive/useOpenFilePreview';
import { logger } from '@internxt-mobile/services/common';
import { DriveItemData } from '@internxt-mobile/types/drive/item';
import { useCallback, useRef, useState } from 'react';
import { useAppDispatch } from 'src/store/hooks';

/**
 * Keeps the files of the preview and the index of the one shown. Changing to another index starts the preview of the
 * file at that index; an index that is the current one or out of range is ignored.
 */
export const useActivePreviewFile = (initialPreviewFiles: DriveItemData[], initialIndex: number) => {
  const dispatch = useAppDispatch();
  const [previewFiles, setPreviewFiles] = useState(initialPreviewFiles);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [removalCount, setRemovalCount] = useState(0);
  const previewFilesRef = useRef(initialPreviewFiles);
  const activeIndexRef = useRef(initialIndex);
  const removedFileUuidsRef = useRef(new Set<string>());

  const changeActiveIndex = useCallback(
    (newIndex: number) => {
      const newActiveFile = previewFiles[newIndex];
      const previousIndex = activeIndexRef.current;
      if (newIndex === previousIndex || !newActiveFile) {
        return;
      }
      logger.info(
        `[DrivePreview] Active file changed from index ${previousIndex} to ${newIndex}, file ${newActiveFile.uuid}`,
      );
      activeIndexRef.current = newIndex;
      setActiveIndex(newIndex);
      dispatch(startFilePreview(newActiveFile));
    },
    [dispatch, previewFiles],
  );

  const removeFiles = useCallback(
    (removedUuids: string[]) => {
      removedUuids.forEach((removedUuid) => removedFileUuidsRef.current.add(removedUuid));
      const currentFiles = previewFilesRef.current;
      const remainingFiles = currentFiles.filter((previewFile) => !removedUuids.includes(previewFile.uuid));
      if (remainingFiles.length === currentFiles.length) {
        return;
      }

      const previousIndex = activeIndexRef.current;
      const isActiveFileRemoved = removedUuids.includes(currentFiles[previousIndex]?.uuid);
      const remainingFilesBeforeActive = currentFiles
        .slice(0, previousIndex)
        .filter((previewFile) => !removedUuids.includes(previewFile.uuid)).length;
      const newIndex = isActiveFileRemoved
        ? Math.max(0, Math.min(remainingFilesBeforeActive, remainingFiles.length - 1))
        : remainingFilesBeforeActive;

      previewFilesRef.current = remainingFiles;
      activeIndexRef.current = newIndex;
      setPreviewFiles(remainingFiles);
      setActiveIndex(newIndex);
      setRemovalCount((revision) => revision + 1);

      if (isActiveFileRemoved && remainingFiles[newIndex]) {
        dispatch(startFilePreview(remainingFiles[newIndex]));
      }
    },
    [dispatch],
  );

  const updateFileName = useCallback((fileUuid: string, name: string) => {
    const renamedFiles = previewFilesRef.current.map((previewFile) =>
      previewFile.uuid === fileUuid ? { ...previewFile, name } : previewFile,
    );
    previewFilesRef.current = renamedFiles;
    setPreviewFiles(renamedFiles);
  }, []);

  const appendFiles = useCallback((newFiles: DriveItemData[]) => {
    const knownUuids = new Set(previewFilesRef.current.map((previewFile) => previewFile.uuid));
    const addedFiles = newFiles.filter((newFile) => !knownUuids.has(newFile.uuid));
    if (addedFiles.length === 0) {
      return;
    }
    const extendedFiles = [...previewFilesRef.current, ...addedFiles];
    previewFilesRef.current = extendedFiles;
    setPreviewFiles(extendedFiles);
  }, []);

  return {
    previewFiles,
    activeIndex,
    activeFile: previewFiles[activeIndex],
    removalCount,
    removedFileUuids: removedFileUuidsRef.current as ReadonlySet<string>,
    changeActiveIndex,
    removeFiles,
    updateFileName,
    appendFiles,
  };
};
