import renameIfNeeded from '@internxt/lib/dist/src/items/renameIfNeeded';
import { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';

export type CheckDuplicates = (
  folderUuid: string,
  files: { plainName: string; type: string }[],
) => Promise<DriveFileData[]>;

export const getUniqueFilename = async (
  filename: string,
  extension: string,
  duplicatedFiles: DriveFileData[],
  parentFolderUuid: string,
  checkDuplicates: CheckDuplicates,
): Promise<string> => {
  let isFileNewNameDuplicated = true;
  let finalFilename = filename;
  let currentDuplicatedFiles = duplicatedFiles;

  do {
    const currentFolderFilesToCheckDuplicates = currentDuplicatedFiles.map((file) => ({
      name: file.plainName ?? file.name,
      type: file.type,
    }));

    const [, , renamedFilename] = renameIfNeeded(currentFolderFilesToCheckDuplicates, finalFilename, extension);

    finalFilename = renamedFilename;

    currentDuplicatedFiles = await checkDuplicates(parentFolderUuid, [{ plainName: renamedFilename, type: extension }]);
    isFileNewNameDuplicated = currentDuplicatedFiles.length > 0;
  } while (isFileNewNameDuplicated);

  return finalFilename;
};
