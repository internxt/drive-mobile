import { useDrive } from '@internxt-mobile/hooks/drive';
import { useRef, useState } from 'react';
import { canLoadNextPage } from './DriveFolderScreen.helpers';

/**
 * Loads the next page of the folder when it has one and no other load of the next page is running.
 * Errors reach the caller.
 */
export const useLoadNextFolderPage = (folderUuid: string | undefined) => {
  const driveCtx = useDrive();
  const [isLoadingNextPage, setIsLoadingNextPage] = useState(false);
  const isLoadingNextPageRef = useRef(false);

  const loadNextPage = async (): Promise<void> => {
    const folderNode = folderUuid ? driveCtx.driveFoldersTree[folderUuid] : undefined;
    if (!folderUuid || isLoadingNextPageRef.current || !canLoadNextPage(folderNode)) {
      return;
    }

    isLoadingNextPageRef.current = true;
    setIsLoadingNextPage(true);
    try {
      await driveCtx.loadFolderContent(folderUuid, { pullFrom: ['network'], resetPagination: false });
    } finally {
      isLoadingNextPageRef.current = false;
      setIsLoadingNextPage(false);
    }
  };

  return { loadNextPage, isLoadingNextPage };
};
