import { useCallback, useRef, useState } from 'react';
import { shareDriveService } from '../services/shareDriveService';
import { CollisionState, NameCollisionAction, SharedFile } from '../types';
import { getFileExtension, getFileNameWithoutExtension } from '../utils';

const EMPTY_COLLISION_STATE: CollisionState = { visible: false, itemNameWithoutExtension: '', collisionCount: 0 };

interface UseNameCollisionReturn {
  collisionState: CollisionState;
  handleCollisionAction: (action: NameCollisionAction | null) => void;
  resetCollisionState: () => void;
  resolveCollisions: (
    files: SharedFile[],
    folderUuid: string,
    isSingleFile: boolean,
    renamedFileName?: string,
  ) => Promise<Map<number, string> | null>;
}

export const useNameCollision = (): UseNameCollisionReturn => {
  const [collisionState, setCollisionState] = useState<CollisionState>(EMPTY_COLLISION_STATE);
  const collisionResolverRef = useRef<((action: NameCollisionAction | null) => void) | null>(null);

  const handleCollisionAction = useCallback((action: NameCollisionAction | null) => {
    collisionResolverRef.current?.(action);
    collisionResolverRef.current = null;
  }, []);

  const resetCollisionState = useCallback(() => {
    setCollisionState(EMPTY_COLLISION_STATE);
  }, []);

  const resolveCollisions = useCallback(
    async (
      files: SharedFile[],
      folderUuid: string,
      isSingleFile: boolean,
      renamedFileName?: string,
    ): Promise<Map<number, string> | null> => {
      const filesList = files.map((file) => {
        const name = isSingleFile && renamedFileName ? renamedFileName : (file.fileName ?? '');
        return { plainName: getFileNameWithoutExtension(name), type: getFileExtension(name) };
      });

      const existentFiles = await shareDriveService.checkDuplicatedFiles(folderUuid, filesList);
      if (existentFiles.length === 0) return new Map();

      const itemNameWithoutExtension =
        existentFiles.length === 1 ? (existentFiles[0].plainName ?? existentFiles[0].name) : '';
      const action = await new Promise<NameCollisionAction | null>((resolve) => {
        collisionResolverRef.current = resolve;
        setCollisionState({ visible: true, itemNameWithoutExtension, collisionCount: existentFiles.length });
      });
      setCollisionState(EMPTY_COLLISION_STATE);

      if (action === null) return null;

      if (action === 'replace') {
        await shareDriveService.trashFiles(existentFiles.map((file) => file.uuid));
        return new Map();
      }

      const renameMap = new Map<number, string>();
      for (let i = 0; i < files.length; i++) {
        const checkName = isSingleFile && renamedFileName ? renamedFileName : (files[i].fileName ?? '');
        const originalPlainName = getFileNameWithoutExtension(checkName);
        const extension = getFileExtension(checkName);
        const existingFileInDrive = existentFiles.find(
          (file) => (file.plainName ?? file.name) === originalPlainName && file.type === extension,
        );
        if (!existingFileInDrive) {
          continue;
        }
        const uniqueName = await shareDriveService.getUniqueFilename(
          originalPlainName,
          extension,
          [existingFileInDrive],
          folderUuid,
        );
        renameMap.set(i, uniqueName);
      }
      return renameMap;
    },
    [],
  );

  return { collisionState, handleCollisionAction, resetCollisionState, resolveCollisions };
};
