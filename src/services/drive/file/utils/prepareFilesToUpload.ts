import { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';
import { DocumentPickerFile } from '../../../../types/drive';
import { checkDuplicatedFiles } from './checkDuplicatedFiles';
import { processDuplicateFiles } from './processDuplicateFiles';

export interface FileToUpload {
  name: string;
  uri: string;
  size: number;
  type: string;
  parentUuid: string;
  modificationTime?: string;
  creationTime?: string;
}

const BATCH_SIZE = 200;

export const prepareFilesToUpload = async ({
  files,
  parentFolderUuid,
  disableDuplicatedNamesCheck = false,
  disableExistenceCheck = false,
}: {
  files: DocumentPickerFile[];
  parentFolderUuid: string;
  disableDuplicatedNamesCheck?: boolean;
  disableExistenceCheck?: boolean;
}): Promise<{ filesToUpload: FileToUpload[]; zeroLengthFilesNumber: number }> => {
  let filesToUpload: FileToUpload[] = [];
  let zeroLengthFilesNumber = 0;

  const processFiles = async (
    filesBatch: DocumentPickerFile[],
    disableDuplicatedNamesCheckOverride: boolean,
    duplicatedFiles?: DriveFileData[],
  ) => {
    const { zeroLengthFiles, newFilesToUpload } = await processDuplicateFiles({
      files: filesBatch,
      existingFilesToUpload: filesToUpload,
      parentFolderUuid,
      disableDuplicatedNamesCheck: disableDuplicatedNamesCheckOverride,
      duplicatedFiles,
    });

    filesToUpload = newFilesToUpload;
    zeroLengthFilesNumber += zeroLengthFiles;
  };

  const processFilesBatch = async (filesBatch: DocumentPickerFile[]) => {
    if (disableExistenceCheck) {
      await processFiles(filesBatch, true);
    } else {
      const mappedFiles = filesBatch.map((f) => ({
        name: f.name,
        uri: f.uri,
        size: f.size,
        type: f.type ?? '',
        modificationTime: f.modificationTime,
        creationTime: f.creationTime,
      }));

      const { duplicatedFilesResponse, filesWithoutDuplicates, filesWithDuplicates } = await checkDuplicatedFiles(
        mappedFiles,
        parentFolderUuid,
      );

      await processFiles(filesWithoutDuplicates as DocumentPickerFile[], true);
      await processFiles(
        filesWithDuplicates as DocumentPickerFile[],
        disableDuplicatedNamesCheck,
        duplicatedFilesResponse,
      );
    }
  };

  // Process files in batches
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    await processFilesBatch(batch);
  }

  return { filesToUpload, zeroLengthFilesNumber };
};
