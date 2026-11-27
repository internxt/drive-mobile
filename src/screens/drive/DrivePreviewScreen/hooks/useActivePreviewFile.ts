import { startFilePreview } from '@internxt-mobile/hooks/drive/useOpenFilePreview';
import { logger } from '@internxt-mobile/services/common';
import { DriveItemData } from '@internxt-mobile/types/drive/item';
import { useCallback, useRef, useState } from 'react';
import { useAppDispatch } from 'src/store/hooks';

/**
 * Keeps the index of the file shown in the preview. Changing to another index starts the preview of the file at that
 * index; an index that is the current one or out of range is ignored.
 */
export const useActivePreviewFile = (previewFiles: DriveItemData[], initialIndex: number) => {
  const dispatch = useAppDispatch();
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const activeIndexRef = useRef(initialIndex);

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
      startFilePreview(dispatch, newActiveFile);
    },
    [dispatch, previewFiles],
  );

  return { activeIndex, activeFile: previewFiles[activeIndex], changeActiveIndex };
};
