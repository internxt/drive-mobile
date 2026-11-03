import { useDrive } from '@internxt-mobile/hooks/drive';
import { logger } from '@internxt-mobile/services/common';
import errorService from '@internxt-mobile/services/ErrorService';
import notificationsService from '@internxt-mobile/services/NotificationsService';
import { isSameSortMode } from '@internxt-mobile/types/drive/ui';
import { NotificationType } from '@internxt-mobile/types/index';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

/**
 * Reloads the folder from the first page when it was loaded in another sort.
 */
export const useReloadFolderInChosenSort = (folderUuid: string): void => {
  const driveCtx = useDrive();
  const folder = driveCtx.driveFoldersTree[folderUuid];
  const isLoadedWithAnotherSort = !!folder?.sortMode && !isSameSortMode(folder.sortMode, driveCtx.sortMode);
  const shouldReloadInChosenSort = isLoadedWithAnotherSort && !folder?.loading && !folder?.error;

  useFocusEffect(
    useCallback(() => {
      if (!shouldReloadInChosenSort) {
        return;
      }

      logger.info(
        `[ReloadInChosenSort] ${folderUuid}: loaded with ${folder?.sortMode?.type}/${folder?.sortMode?.direction}, reloading with ${driveCtx.sortMode.type}/${driveCtx.sortMode.direction}`,
      );
      driveCtx.loadFolderContent(folderUuid, { pullFrom: ['network'], resetPagination: true }).catch((error) => {
        logger.error(`[ReloadInChosenSort] ${folderUuid}: reload failed`, error);
        errorService.reportError(error);
        const castedError = errorService.castError(error, 'content');
        notificationsService.show({ type: NotificationType.Error, text1: castedError.message });
      });
    }, [shouldReloadInChosenSort, folderUuid]),
  );
};
