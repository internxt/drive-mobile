import { DriveFileData } from '@internxt-mobile/types/drive/file';
import { driveFileService } from '../driveFile.service';

export interface DuplicatedFilesResult {
  duplicatedFilesResponse: DriveFileData[];
  filesWithDuplicates: File[];
  filesWithoutDuplicates: File[];
}

interface FileInfo {
  plainName: string;
  type: string;
  originalFile: File;
}

export interface File {
  name: string;
  uri: string;
  size: number;
  type?: string;
  modificationTime?: string;
  creationTime?: string;
}

export const checkDuplicatedFiles = async (files: File[], parentFolderUuid: string): Promise<DuplicatedFilesResult> => {
  if (files.length === 0) {
    return {
      duplicatedFilesResponse: [],
      filesWithDuplicates: [],
      filesWithoutDuplicates: files,
    };
  }

  const parsedFiles = files.map(parseFile);

  const checkDuplicatedFileResponse = await driveFileService.checkFileExistence(
    parentFolderUuid,
    parsedFiles.map((f) => ({ plainName: f.plainName, type: f.type })),
  );

  const duplicatedFilesResponse = checkDuplicatedFileResponse.existentFiles;

  const { filesWithDuplicates, filesWithoutDuplicates } = parsedFiles.reduce(
    (acc, parsedFile) => {
      const isDuplicated = duplicatedFilesResponse.some(
        (duplicatedFile) =>
          duplicatedFile.plainName === parsedFile.plainName && duplicatedFile.type === parsedFile.type,
      );

      if (isDuplicated) {
        acc.filesWithDuplicates.push(parsedFile.originalFile);
      } else {
        acc.filesWithoutDuplicates.push(parsedFile.originalFile);
      }

      return acc;
    },
    { filesWithDuplicates: [], filesWithoutDuplicates: [] } as {
      filesWithDuplicates: File[];
      filesWithoutDuplicates: File[];
    },
  );

  return { duplicatedFilesResponse, filesWithoutDuplicates, filesWithDuplicates };
};

const parseFile = (file: File): FileInfo => {
  const { plainName, extension } = getFilenameAndExt(file.name);
  return {
    plainName,
    type: extension ?? file.type ?? '',
    originalFile: file,
  };
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
