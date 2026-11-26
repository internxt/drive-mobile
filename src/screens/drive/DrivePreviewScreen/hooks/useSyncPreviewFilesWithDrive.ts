import { DriveItemData } from '@internxt-mobile/types/drive/item';
import { useEffect } from 'react';
import { useAppSelector } from 'src/store/hooks';
import { onDriveItemMoved } from 'src/useCases/drive/onDriveItemMoved';
import { onDriveItemsTrashed } from 'src/useCases/drive/onDriveItemsTrashed';

interface UseSyncPreviewFilesWithDriveParams {
  activeFile: DriveItemData | undefined;
  removeFiles: (removedUuids: string[]) => void;
  updateFileName: (fileUuid: string, name: string) => void;
}

export const useSyncPreviewFilesWithDrive = ({
  activeFile,
  removeFiles,
  updateFileName,
}: UseSyncPreviewFilesWithDriveParams) => {
  const { focusedItem } = useAppSelector((state) => state.drive);

  useEffect(() => {
    const unsubscribeMoved = onDriveItemMoved(({ movedUuids }) => removeFiles(movedUuids));
    const unsubscribeTrashed = onDriveItemsTrashed(({ trashedUuids }) => removeFiles(trashedUuids));

    return () => {
      unsubscribeMoved();
      unsubscribeTrashed();
    };
  }, [removeFiles]);

  useEffect(() => {
    if (focusedItem && focusedItem.uuid === activeFile?.uuid && focusedItem.name !== activeFile.name) {
      updateFileName(focusedItem.uuid, focusedItem.name);
    }
  }, [focusedItem?.uuid, focusedItem?.name, activeFile?.uuid, activeFile?.name, updateFileName]);
};
