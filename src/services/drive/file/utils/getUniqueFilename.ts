import renameIfNeeded from '@internxt/lib/dist/items/renameIfNeeded';
import { DriveFileData } from '../../../../types/drive/file';

type FileNameAndType = Pick<DriveFileData, 'plainName' | 'type'>;

export type CheckDuplicates = (
  folderUuid: string,
  files: { plainName: string; type: string }[],
) => Promise<FileNameAndType[]>;

export const getUniqueFilename = async (
  filename: string,
  extension: string,
  duplicatedFiles: FileNameAndType[],
  parentFolderUuid: string,
  checkDuplicates: CheckDuplicates,
): Promise<string> => {
  let isFileNewNameDuplicated = true;
  let finalFilename = filename;
  let currentDuplicatedFiles = duplicatedFiles;

  do {
    const currentFolderFilesToCheckDuplicates = currentDuplicatedFiles.map((file) => ({
      name: file.plainName,
      type: file.type,
    }));

    const [, , renamedFilename] = renameIfNeeded(currentFolderFilesToCheckDuplicates, finalFilename, extension);

    finalFilename = renamedFilename;

    currentDuplicatedFiles = await checkDuplicates(parentFolderUuid, [{ plainName: renamedFilename, type: extension }]);
    isFileNewNameDuplicated = currentDuplicatedFiles.length > 0;
  } while (isFileNewNameDuplicated);

  return finalFilename;
};
