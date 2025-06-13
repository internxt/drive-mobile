import { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';
import { DocumentPickerResponse } from 'react-native-document-picker';
import { checkDuplicatedFiles } from './checkDuplicatedFiles';
import { processDuplicateFiles } from './processDuplicateFiles';

export interface FileToUpload {
  name: string;
  uri: string;
  size: number;
  type: string;
  parentUuid: string;
}

const BATCH_SIZE = 200;

export const prepareFilesToUpload = async ({
  files,
  parentFolderUuid,
  disableDuplicatedNamesCheck = false,
  disableExistenceCheck = false,
}: {
  files: DocumentPickerResponse[];
  parentFolderUuid: string;
  disableDuplicatedNamesCheck?: boolean;
  disableExistenceCheck?: boolean;
}): Promise<{ filesToUpload: FileToUpload[]; zeroLengthFilesNumber: number }> => {
  let filesToUpload: FileToUpload[] = [];
  let zeroLengthFilesNumber = 0;

  const processFiles = async (
    filesBatch: DocumentPickerResponse[],
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

  const processFilesBatch = async (filesBatch: DocumentPickerResponse[]) => {
    if (disableExistenceCheck) {
      await processFiles(filesBatch, true);
    } else {
      const mappedFiles = filesBatch.map((f) => ({
        name: f.name,
        uri: f.uri,
        size: f.size,
        type: f.type ?? '',
      }));

      const { duplicatedFilesResponse, filesWithoutDuplicates, filesWithDuplicates } = await checkDuplicatedFiles(
        mappedFiles,
        parentFolderUuid,
      );

      await processFiles(filesWithoutDuplicates as DocumentPickerResponse[], true);
      await processFiles(
        filesWithDuplicates as DocumentPickerResponse[],
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
