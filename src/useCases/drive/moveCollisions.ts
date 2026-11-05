import drive from '@internxt-mobile/services/drive';
import { getUniqueFilename } from '@internxt-mobile/services/drive/file/utils/getUniqueFilename';
import { getUniqueFolderName } from '@internxt-mobile/services/drive/folder/utils/getUniqueFolderName';
import { chunk } from 'lodash';
import { MovableItem } from './move';
import { MAX_ITEMS_PER_TRASH_REQUEST } from './trash';

const MAX_NAMES_PER_EXISTENCE_CHECK = 200;

export type MoveCollisionAction = 'replace' | 'keep-both' | 'skip';

export interface MoveCollision {
  item: MovableItem;
  existingItemUuid: string;
}

const getFileNameKey = (name: string, type?: string | null) => JSON.stringify([name, type ?? '']);

const findFolderCollisions = async (folders: MovableItem[], destinationFolderUuid: string) => {
  const existingFolderUuidByName = new Map<string, string>();
  for (const folderBatch of chunk(folders, MAX_NAMES_PER_EXISTENCE_CHECK)) {
    const { existentFolders } = await drive.folder.checkDuplicatedFolders(
      destinationFolderUuid,
      folderBatch.map((folder) => folder.name),
    );
    existentFolders.forEach((existingFolder) => {
      existingFolderUuidByName.set(existingFolder.plainName, existingFolder.uuid);
    });
  }

  return folders.flatMap<MoveCollision>((folder) => {
    const existingItemUuid = existingFolderUuidByName.get(folder.name);
    return existingItemUuid ? [{ item: folder, existingItemUuid }] : [];
  });
};

const findFileCollisions = async (files: MovableItem[], destinationFolderUuid: string) => {
  const existingFileUuidByKey = new Map<string, string>();
  for (const fileBatch of chunk(files, MAX_NAMES_PER_EXISTENCE_CHECK)) {
    const { existentFiles } = await drive.file.checkFileExistence(
      destinationFolderUuid,
      fileBatch.map((file) => ({ plainName: file.name, type: file.type ?? '' })),
    );
    existentFiles.forEach((existingFile) => {
      existingFileUuidByKey.set(getFileNameKey(existingFile.plainName, existingFile.type), existingFile.uuid);
    });
  }

  return files.flatMap<MoveCollision>((file) => {
    const existingItemUuid = existingFileUuidByKey.get(getFileNameKey(file.name, file.type));
    return existingItemUuid ? [{ item: file, existingItemUuid }] : [];
  });
};

/**
 * Returns the items that have a folder or a file with the same name in the destination folder, in the order of
 * `items`. Throws if an existence check fails.
 */
export const findMoveCollisions = async (
  items: MovableItem[],
  destinationFolderUuid: string,
): Promise<MoveCollision[]> => {
  const folderCollisions = await findFolderCollisions(
    items.filter((item) => item.isFolder),
    destinationFolderUuid,
  );
  const fileCollisions = await findFileCollisions(
    items.filter((item) => !item.isFolder),
    destinationFolderUuid,
  );
  const collisionByUuid = new Map(
    [...folderCollisions, ...fileCollisions].map((collision) => [collision.item.uuid, collision]),
  );

  return items.flatMap((item) => {
    const collision = collisionByUuid.get(item.uuid);
    return collision ? [collision] : [];
  });
};

/**
 * Returns `actionsByUuid` with `action` set on the first pending collision, or on every pending collision when
 * `shouldApplyToAll` is true.
 */
export const applyCollisionAction = ({
  pendingCollisions,
  actionsByUuid,
  action,
  shouldApplyToAll,
}: {
  pendingCollisions: MoveCollision[];
  actionsByUuid: Map<string, MoveCollisionAction>;
  action: MoveCollisionAction;
  shouldApplyToAll: boolean;
}) => {
  const decidedCollisions = shouldApplyToAll ? pendingCollisions : pendingCollisions.slice(0, 1);
  const nextActionsByUuid = new Map(actionsByUuid);
  decidedCollisions.forEach((collision) => nextActionsByUuid.set(collision.item.uuid, action));
  return nextActionsByUuid;
};

interface TakenNames {
  folderNames: Set<string>;
  fileNameKeys: Set<string>;
}

const getFreeName = (item: MovableItem, destinationFolderUuid: string, takenNames: TakenNames) => {
  if (item.isFolder) {
    return getUniqueFolderName(item.name, destinationFolderUuid, async (parentFolderUuid, names) => {
      const { existentFolders } = await drive.folder.checkDuplicatedFolders(parentFolderUuid, names);
      const takenFolderNames = new Set(existentFolders.map((existingFolder) => existingFolder.plainName));
      names.filter((name) => takenNames.folderNames.has(name)).forEach((name) => takenFolderNames.add(name));
      return takenFolderNames;
    });
  }

  const collidingFile = { plainName: item.name, type: item.type ?? '' };
  return getUniqueFilename(
    item.name,
    item.type ?? '',
    [collidingFile],
    destinationFolderUuid,
    async (parentFolderUuid, files) => {
      const { existentFiles } = await drive.file.checkFileExistence(parentFolderUuid, files);
      const locallyTakenFiles = files.filter((file) =>
        takenNames.fileNameKeys.has(getFileNameKey(file.plainName, file.type)),
      );
      return [...existentFiles, ...locallyTakenFiles];
    },
  );
};

const addTakenName = (takenNames: TakenNames, item: MovableItem, name: string) => {
  if (item.isFolder) {
    takenNames.folderNames.add(name);
  } else {
    takenNames.fileNameKeys.add(getFileNameKey(name, item.type));
  }
};

/**
 * Applies the decided action to each collision and returns the items to move, with `newName` set on the renamed
 * ones, plus the uuids of the destination items sent to trash. Throws if a name check or the trash fails; names are
 * resolved before anything is sent to trash.
 */
export const resolveMoveCollisions = async ({
  items,
  collisions,
  actionsByUuid,
  destinationFolderUuid,
}: {
  items: MovableItem[];
  collisions: MoveCollision[];
  actionsByUuid: Map<string, MoveCollisionAction>;
  destinationFolderUuid: string;
}): Promise<{ finalItemsToMove: MovableItem[]; trashedDestinationItemUuids: string[] }> => {
  const notSkippedItems = items.filter((item) => actionsByUuid.get(item.uuid) !== 'skip');

  const takenNames: TakenNames = { folderNames: new Set(), fileNameKeys: new Set() };
  notSkippedItems
    .filter((item) => actionsByUuid.get(item.uuid) !== 'keep-both')
    .forEach((item) => addTakenName(takenNames, item, item.name));
  const finalItemsToMove: MovableItem[] = [];
  for (const item of notSkippedItems) {
    if (actionsByUuid.get(item.uuid) !== 'keep-both') {
      finalItemsToMove.push(item);
      continue;
    }
    const newName = await getFreeName(item, destinationFolderUuid, takenNames);
    addTakenName(takenNames, item, newName);
    finalItemsToMove.push({ ...item, newName });
  }

  const replacedDestinationItems = collisions
    .filter((collision) => actionsByUuid.get(collision.item.uuid) === 'replace')
    .map((collision) => ({
      uuid: collision.existingItemUuid,
      type: collision.item.isFolder ? ('folder' as const) : ('file' as const),
    }));
  for (const replacedBatch of chunk(replacedDestinationItems, MAX_ITEMS_PER_TRASH_REQUEST)) {
    await drive.trash.moveToTrash(replacedBatch);
  }

  return {
    finalItemsToMove,
    trashedDestinationItemUuids: replacedDestinationItems.map((replacedItem) => replacedItem.uuid),
  };
};
