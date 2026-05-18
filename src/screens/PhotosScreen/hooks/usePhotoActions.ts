import strings from 'assets/lang/strings';
import { useCallback, useEffect, useRef, useState } from 'react';
import { logger } from 'src/services/common';
import { photoActionsService } from 'src/services/photos/PhotoActionsService';
import { PhotoSelection } from './usePhotoSelection';

export interface UsePhotoActionsReturn {
  actionLabel: string | null;
  isMoreActionsSheetOpen: boolean;
  handleExport: () => Promise<void>;
  handleSave: () => Promise<void>;
  handleCopy: () => Promise<void>;
  handleMore: () => void;
  handleMoreClose: () => void;
  todoAction: (name: string) => () => void;
}

export const usePhotoActions = (selection: PhotoSelection): UsePhotoActionsReturn => {
  const [actionLabel, setActionLabel] = useState<string | null>(null);
  const [isMoreActionsSheetOpen, setIsMoreActionsSheetOpen] = useState(false);
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
    } finally {
      finishAction();
    }
  }, [startAction, finishAction, selection.selectedItems]);

  const handleSave = useCallback(async () => {
    const { signal } = startAction(strings.screens.photos.selection.actionProgress.saving);
    try {
      for (const item of selection.selectedItems) {
        await photoActionsService.saveToDevice(item, signal);
        if (signal.aborted) break;
      }
    } catch (error) {
      logger.error(`[usePhotoActions] Save error: ${error}`);
    } finally {
      finishAction();
    }
  }, [startAction, finishAction, selection.selectedItems]);

  const handleCopy = useCallback(async () => {
    const item = selection.selectedItems[0];
    if (!item) return;
    const { signal } = startAction(strings.screens.photos.selection.actionProgress.copying);
    try {
      await photoActionsService.copyToClipboard(item, signal);
    } catch (error) {
      logger.error(`[usePhotoActions] Copy error: ${error}`);
    } finally {
      finishAction();
    }
  }, [startAction, finishAction, selection.selectedItems]);

  const todoAction = useCallback(
    (name: string) => () => {
      logger.info(`[usePhotoActions] action not yet implemented: ${name}`);
      selection.exitSelectMode();
      setIsMoreActionsSheetOpen(false);
    },
    [selection],
  );

  const handleMore = useCallback(() => setIsMoreActionsSheetOpen(true), []);
  const handleMoreClose = useCallback(() => setIsMoreActionsSheetOpen(false), []);

  return {
    actionLabel,
    isMoreActionsSheetOpen,
    handleExport,
    handleSave,
    handleCopy,
    handleMore,
    handleMoreClose,
    todoAction,
  };
};
