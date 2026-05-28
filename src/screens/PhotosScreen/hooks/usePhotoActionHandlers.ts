import strings from 'assets/lang/strings';
import { useCallback, useEffect, useRef } from 'react';
import { logger } from 'src/services/common';
import { notifications } from 'src/services/NotificationsService';
import { SavePermissionDeniedError } from 'src/services/photos/errors';
import { photoActionsService } from 'src/services/photos/PhotoActionsService';
import { TimelinePhotoItem } from '../types';
import { getSavedNotificationMessage, getTrashNotificationMessage } from '../utils/photoUtils';

interface UsePhotoActionHandlersOpts {
  items: TimelinePhotoItem[];
  onActionStart?: (label: string) => void;
  onActionEnd?: () => void;
  onAfterSave?: () => void | Promise<void>;
  onAfterTrash?: () => void | Promise<void>;
  onAfterRestore?: () => void | Promise<void>;
}

export interface UsePhotoActionHandlersReturn {
  handleExport: () => Promise<void>;
  handleSave: () => Promise<void>;
  handleCopy: () => Promise<void>;
  handleTrashConfirm: () => Promise<void>;
  handleRestore: () => Promise<void>;
}

export const usePhotoActionHandlers = ({
  items,
  onActionStart,
  onActionEnd,
  onAfterSave,
  onAfterTrash,
  onAfterRestore,
}: UsePhotoActionHandlersOpts): UsePhotoActionHandlersReturn => {
  const abortRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  const startAction = useCallback(
    (label: string): AbortController => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      onActionStart?.(label);
      return controller;
    },
    [onActionStart],
  );

  const handleExport = useCallback(async () => {
    const { signal } = startAction(strings.screens.photos.selection.actionProgress.preparing);
    try {
      await photoActionsService.exportItems(items, signal);
    } catch (error) {
      logger.error(`[usePhotoActionHandlers] Export error: ${error}`);
      notifications.error(strings.screens.photos.notifications.exportError);
    } finally {
      onActionEnd?.();
    }
  }, [startAction, onActionEnd, items]);

  const handleSave = useCallback(async () => {
    const { signal } = startAction(strings.screens.photos.selection.actionProgress.saving);
    try {
      for (const item of items) {
        await photoActionsService.saveToDevice(item, signal);
        if (signal.aborted) break;
        notifications.success(getSavedNotificationMessage(item));
        await onAfterSave?.();
      }
    } catch (error) {
      logger.error(`[usePhotoActionHandlers] Save error: ${error}`);
      if (error instanceof SavePermissionDeniedError) {
        notifications.error(strings.screens.photos.notifications.saveErrorNoPermission);
      } else {
        notifications.error(strings.screens.photos.notifications.saveError);
      }
    } finally {
      onActionEnd?.();
    }
  }, [startAction, onActionEnd, onAfterSave, items]);

  const handleCopy = useCallback(async () => {
    const item = items[0];
    if (!item) return;
    const { signal } = startAction(strings.screens.photos.selection.actionProgress.copying);
    try {
      await photoActionsService.copyToClipboard(item, signal);
      notifications.success(strings.screens.photos.notifications.photoCopied);
    } catch (error) {
      logger.error(`[usePhotoActionHandlers] Copy error: ${error}`);
      notifications.error(strings.screens.photos.notifications.copyError);
    } finally {
      onActionEnd?.();
    }
  }, [startAction, onActionEnd, items]);

  const handleTrashConfirm = useCallback(async () => {
    const count = items.length;
    const { signal } = startAction(strings.screens.photos.selection.actionProgress.movingToTrash);
    try {
      await photoActionsService.trash(items, signal);
      notifications.success(getTrashNotificationMessage(count));
      await onAfterTrash?.();
    } catch (error) {
      logger.error(`[usePhotoActionHandlers] Trash error: ${error}`);
      notifications.error(strings.screens.photos.notifications.trashError);
    } finally {
      onActionEnd?.();
    }
  }, [startAction, onActionEnd, items, onAfterTrash]);

  const handleRestore = useCallback(async () => {
    const { signal } = startAction(strings.screens.photos.selection.actionProgress.uploadingToCloud);
    try {
      await photoActionsService.restoreToCloud(items, signal);
      await onAfterRestore?.();
    } catch (error) {
      logger.error(`[usePhotoActionHandlers] Restore error: ${error}`);
      notifications.error(strings.screens.photos.notifications.restoreError);
    } finally {
      onActionEnd?.();
    }
  }, [startAction, onActionEnd, items, onAfterRestore]);

  return { handleExport, handleSave, handleCopy, handleTrashConfirm, handleRestore };
};
