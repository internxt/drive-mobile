import { useCallback, useState } from 'react';
import { useAppDispatch } from 'src/store/hooks';
import { runBackupCycleThunk, runUploadThunk } from 'src/store/slices/photos';
import { usePhotoActionHandlers } from './usePhotoActionHandlers';
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

  const {
    handleExport,
    handleSave,
    handleCopy,
    handleTrashConfirm: baseHandleTrashConfirm,
    handleRestore,
  } = usePhotoActionHandlers({
    items: selection.selectedItems,
    onActionStart: setActionLabel,
    onActionEnd: useCallback(() => {
      setActionLabel(null);
      selection.exitSelectMode();
      setIsMoreActionsSheetOpen(false);
    }, [selection]),
    onAfterSave: useCallback(async () => {
      await reloadLocal();
      dispatch(runBackupCycleThunk());
    }, [reloadLocal, dispatch]),
    onAfterTrash: useCallback(async () => {
      await reloadLocal();
      await reloadCloud();
    }, [reloadLocal, reloadCloud]),
    onAfterRestore: useCallback(async () => {
      await dispatch(runUploadThunk({ bypassEnabled: true })).unwrap();
      await reloadLocal();
      await reloadCloud();
    }, [dispatch, reloadLocal, reloadCloud]),
  });

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
    await baseHandleTrashConfirm();
  }, [baseHandleTrashConfirm]);

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
