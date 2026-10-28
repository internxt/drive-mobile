import { useDrive } from '@internxt-mobile/hooks/drive';
import { notifyParentChanged } from '@internxt-mobile/services/native/InternxtSignalingModule';
import { DriveListItem } from '@internxt-mobile/types/drive/item';
import * as driveUseCases from '@internxt-mobile/useCases/drive';
import { useState } from 'react';
import { SLEEP_BECAUSE_MAYBE_BACKEND_IS_NOT_RETURNING_FRESHLY_MODIFIED_OR_CREATED_ITEMS_YET } from 'src/helpers/services';

const RELOAD_DELAY_MS = 500;

interface UseTrashSelectedItemsParams {
  folderUuid: string;
  onTrashed: () => void;
}

export const useTrashSelectedItems = ({ folderUuid, onTrashed }: UseTrashSelectedItemsParams) => {
  const driveCtx = useDrive();
  const [isTrashing, setIsTrashing] = useState(false);

  const reloadFolder = async () => {
    await SLEEP_BECAUSE_MAYBE_BACKEND_IS_NOT_RETURNING_FRESHLY_MODIFIED_OR_CREATED_ITEMS_YET(RELOAD_DELAY_MS);
    await driveCtx.loadFolderContent(folderUuid, { pullFrom: ['network'], resetPagination: true });
  };

  const restoreItems = async (items: DriveListItem[]) => {
    const { success } = await driveUseCases.restoreDriveItems(
      items.map(({ data }) => ({
        fileId: data.isFolder ? undefined : data.uuid,
        folderId: data.isFolder ? data.uuid : undefined,
        destinationFolderId: (data.isFolder ? data.parentUuid : data.folderUuid) ?? folderUuid,
      })),
      { displayNotification: false },
    );
    if (success) {
      await reloadFolder();
    }
  };

  const trashItems = async (items: DriveListItem[]) => {
    setIsTrashing(true);
    const { success, data: trashResult } = await driveUseCases.moveItemsToTrash(
      items.map(({ data }) => ({ uuid: data.uuid, type: data.isFolder ? 'folder' : 'file' })),
      () => restoreItems(items),
    );
    setIsTrashing(false);
    const trashedUuids = trashResult?.trashedUuids ?? [];
    trashedUuids.forEach((uuid) => driveCtx.removeItemFromTree(folderUuid, uuid));
    if (trashedUuids.length > 0) {
      void notifyParentChanged(folderUuid);
    }
    if (success) {
      onTrashed();
    }
  };

  return { isTrashing, trashItems };
};
