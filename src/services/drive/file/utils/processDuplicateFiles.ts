import { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';
import { DocumentPickerResponse } from 'react-native-document-picker';
import { DocumentPickerFile } from '../../../../types/drive';
import { getUniqueFilename } from './getUniqueFilename';
import { FileToUpload } from './prepareFilesToUpload';

interface ProcessDuplicateFilesParams {
  files: DocumentPickerResponse[];
  existingFilesToUpload: FileToUpload[];
  parentFolderUuid: string;
  disableDuplicatedNamesCheck?: boolean;
  duplicatedFiles?: DriveFileData[];
}

export const processDuplicateFiles = async ({
  files,
  existingFilesToUpload,
  parentFolderUuid,
  disableDuplicatedNamesCheck,
  duplicatedFiles,
}: ProcessDuplicateFilesParams): Promise<{
  newFilesToUpload: FileToUpload[];
}> => {
  const newFilesToUpload: FileToUpload[] = [...existingFilesToUpload];

  const processFile = async (file: DocumentPickerFile): Promise<void> => {
    const { plainName, extension } = getFilenameAndExt(file.name);
    let finalFilename = plainName;

    if (!disableDuplicatedNamesCheck && duplicatedFiles) {
      finalFilename = await getUniqueFilename(plainName, extension, duplicatedFiles, parentFolderUuid);
    }

    newFilesToUpload.push({
      name: finalFilename,
      size: file.size,
      type: extension ?? file.type ?? '',
      uri: file.uri,
      parentUuid: parentFolderUuid,
      modificationTime: file.modificationTime ?? undefined,
      creationTime: file.creationTime ?? undefined,
    });
  };

  await Promise.all(files.map(processFile));

  return { newFilesToUpload };
};

const getFilenameAndExt = (filename: string): { plainName: string; extension: string } => {
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return { plainName: filename, extension: '' };
  }
  return {
    plainName: filename.substring(0, lastDotIndex),
    extension: filename.substring(lastDotIndex + 1),
  };
};
