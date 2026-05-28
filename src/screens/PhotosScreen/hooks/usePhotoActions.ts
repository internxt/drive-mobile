import strings from 'assets/lang/strings';
import { useCallback, useEffect, useRef, useState } from 'react';
import { logger } from 'src/services/common';
import { notifications } from 'src/services/NotificationsService';
import { SavePermissionDeniedError } from 'src/services/photos/errors';
import { photoActionsService } from 'src/services/photos/PhotoActionsService';
import { useAppDispatch } from 'src/store/hooks';
import { runUploadThunk } from 'src/store/slices/photos';
import { getSavedNotificationMessage, getTrashNotificationMessage } from '../utils/photoUtils';
import { PhotoSelection } from './usePhotoSelection';

export interface UsePhotoActionsReturn {
  actionLabel: string | null;
  isMoreActionsSheetOpen: boolean;
  isDeleteConfirmOpen: boolean;
  handleExport: () => Promise<void>;
  handleSave: () => Promise<void>;
  handleCopy: () => Promise<void>;
  handleDelete: () => void;
  handleTrash: () => void;
  handleDeleteClose: () => void;
  handleTrashConfirm: () => Promise<void>;
  handleRestore: () => Promise<void>;
  handleMore: () => void;
  handleMoreClose: () => void;
}

interface UsePhotoActionsOpts {
  reloadLocal: () => Promise<void>;
  reloadCloud: () => Promise<void>;
}

export const usePhotoActions = (
  selection: PhotoSelection,
  { reloadLocal, reloadCloud }: UsePhotoActionsOpts,
): UsePhotoActionsReturn => {
  const dispatch = useAppDispatch();
  const [actionLabel, setActionLabel] = useState<string | null>(null);
  const [isMoreActionsSheetOpen, setIsMoreActionsSheetOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const actionAbortRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      actionAbortRef.current?.abort();
    },
    [],
  );

  const startAction = useCallback((label: string): AbortController => {
    actionAbortRef.current?.abort();
    const controller = new AbortController();
    actionAbortRef.current = controller;
    setActionLabel(label);
    return controller;
  }, []);

  const finishAction = useCallback(() => {
    setActionLabel(null);
    selection.exitSelectMode();
    setIsMoreActionsSheetOpen(false);
  }, [selection]);

  const handleExport = useCallback(async () => {
    const { signal } = startAction(strings.screens.photos.selection.actionProgress.preparing);
    try {
      await photoActionsService.exportItems(selection.selectedItems, signal);
    } catch (error) {
      logger.error(`[usePhotoActions] Export error: ${error}`);
      notifications.error(strings.screens.photos.notifications.exportError);
    } finally {
      finishAction();
    }
  }, [startAction, finishAction, selection.selectedItems]);

  const handleSave = useCallback(async () => {
    const { signal } = startAction(strings.screens.photos.selection.actionProgress.saving);
    try {
      for (const item of selection.selectedItems) {
        await photoActionsService.saveToDevice(item, signal);
        if (signal.aborted) {
          break;
        }
        notifications.success(getSavedNotificationMessage(item));
      }
    } catch (error) {
      logger.error(`[usePhotoActions] Save error: ${error}`);
      if (error instanceof SavePermissionDeniedError) {
        notifications.error(strings.screens.photos.notifications.saveErrorNoPermission);
      } else {
        notifications.error(strings.screens.photos.notifications.saveError);
      }
    } finally {
      finishAction();
    }
  }, [startAction, finishAction, selection.selectedItems]);

  const handleCopy = useCallback(async () => {
    const item = selection.selectedItems[0];
    if (!item) {
      return;
    }
    const { signal } = startAction(strings.screens.photos.selection.actionProgress.copying);
    try {
      await photoActionsService.copyToClipboard(item, signal);
      notifications.success(strings.screens.photos.notifications.photoCopied);
    } catch (error) {
      logger.error(`[usePhotoActions] Copy error: ${error}`);
      notifications.error(strings.screens.photos.notifications.copyError);
    } finally {
      finishAction();
    }
  }, [startAction, finishAction, selection.selectedItems]);

  const handleDelete = useCallback(() => {
    setIsMoreActionsSheetOpen(false);
    setIsDeleteConfirmOpen(true);
  }, []);

  const handleTrash = useCallback(() => {
    setIsMoreActionsSheetOpen(false);
    setIsDeleteConfirmOpen(true);
  }, []);

  const handleDeleteClose = useCallback(() => setIsDeleteConfirmOpen(false), []);

  const handleTrashConfirm = useCallback(async () => {
    setIsDeleteConfirmOpen(false);
    const selectedItemsLength = selection.selectedItems.length;
    const { signal } = startAction(strings.screens.photos.selection.actionProgress.movingToTrash);
    try {
      await photoActionsService.trash(selection.selectedItems, signal);
      await reloadLocal();
      await reloadCloud();
      notifications.success(getTrashNotificationMessage(selectedItemsLength));
    } catch (error) {
      logger.error(`[usePhotoActions] Trash error: ${error}`);
      notifications.error(strings.screens.photos.notifications.trashError);
    } finally {
      finishAction();
    }
  }, [startAction, finishAction, selection.selectedItems, reloadLocal, reloadCloud]);

  const handleRestore = useCallback(async () => {
    const { signal } = startAction(strings.screens.photos.selection.actionProgress.uploadingToCloud);
    try {
      await photoActionsService.restoreToCloud(selection.selectedItems, signal);
      await dispatch(runUploadThunk({ bypassEnabled: true })).unwrap();
      await reloadLocal();
      await reloadCloud();
      notifications.info(strings.screens.photos.notifications.restoreStarted);
    } catch (error) {
      logger.error(`[usePhotoActions] Restore error: ${error}`);
      notifications.error(strings.screens.photos.notifications.restoreError);
    } finally {
      finishAction();
    }
  }, [startAction, finishAction, selection.selectedItems, dispatch, reloadLocal, reloadCloud]);

  const handleMore = useCallback(() => setIsMoreActionsSheetOpen(true), []);
  const handleMoreClose = useCallback(() => setIsMoreActionsSheetOpen(false), []);

  return {
    actionLabel,
    isMoreActionsSheetOpen,
    isDeleteConfirmOpen,
    handleExport,
    handleSave,
    handleCopy,
    handleDelete,
    handleTrash,
    handleDeleteClose,
    handleTrashConfirm,
    handleRestore,
    handleMore,
    handleMoreClose,
  };
};
