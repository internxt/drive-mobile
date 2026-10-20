import {
  DocumentPickerResponse,
  keepLocalCopy,
  KeepLocalCopyResponse,
  NonEmptyArray,
  type FileToCopy,
} from '@react-native-documents/picker';
import strings from '../../../../../assets/lang/strings';
import { DocumentPickerFile } from '../../../../types/drive/operations';
import { NotificationType } from '../../../../types';
import { logger } from '../../../common';
import fileSystemService from '../../../FileSystemService';
import notificationsService from '../../../NotificationsService';
import { splitUnreadablePickedFiles } from './splitUnreadablePickedFiles';

interface ReadablePickedFile {
  uri: string;
  name: string;
  size: number | null;
  type: string | null;
}

/**
 * Returns the size in bytes of the file at `fileUri`, or `null` if it does not exist or its size cannot be read.
 */
const readLocalFileSize = (fileUri: string): number | null => {
  try {
    const fileInfo = fileSystemService.getFileInfo(fileUri);
    return fileInfo.exists ? (fileInfo.size ?? null) : null;
  } catch (error) {
    logger.warn('The file size could not be obtained:', error);
    return null;
  }
};

const resolvePickedFilesFromLocalCopies = (
  readablePickedFiles: ReadablePickedFile[],
  localCopiedFiles: KeepLocalCopyResponse,
) => {
  const filesWithLocalUri: DocumentPickerFile[] = [];
  let unknownSizeFileCount = 0;

  for (const pickedFile of readablePickedFiles) {
    const localCopy = localCopiedFiles.find((localCopiedFile) => localCopiedFile.sourceUri === pickedFile.uri);
    if (localCopy?.status === 'error') {
      logger.warn(
        `keepLocalCopy failed for "${pickedFile.name}", falling back to original URI. Error: ${localCopy.copyError}`,
      );
    }
    const localUri = localCopy?.status === 'success' ? localCopy.localUri : pickedFile.uri;
    const fileSize = pickedFile.size ?? readLocalFileSize(localUri);
    if (fileSize === null) {
      unknownSizeFileCount++;
      continue;
    }
    filesWithLocalUri.push({
      uri: localUri,
      name: pickedFile.name,
      size: fileSize,
      type: pickedFile.type ?? '',
    });
  }

  return { filesWithLocalUri, unknownSizeFileCount };
};

const notifyUnreadablePickedFiles = (unreadableFileCount: number) => {
  if (unreadableFileCount === 0) {
    return;
  }

  const warningMessage =
    unreadableFileCount === 1
      ? strings.errors.unreadablePickedFile
      : strings.formatString(strings.errors.unreadablePickedFiles, unreadableFileCount);

  notificationsService.show({
    type: NotificationType.Warning,
    text1: warningMessage as string,
  });
};

/**
 * Copies the picked files to the caches directory and returns them ready to upload. A file whose copy fails keeps
 * its original uri. A file without a size from the picker takes the size of its copy. Files the picker could not
 * read, and files whose size cannot be read, are left out and reported with a warning.
 */
export const preparePickedFilesForUpload = async (
  pickedFiles: DocumentPickerResponse[],
): Promise<DocumentPickerFile[]> => {
  const { readablePickedFiles, unreadablePickedFiles } = splitUnreadablePickedFiles(pickedFiles);

  if (readablePickedFiles.length === 0) {
    notifyUnreadablePickedFiles(unreadablePickedFiles.length);
    return [];
  }

  const filesToCopy = readablePickedFiles.map(
    (pickedFile): FileToCopy => ({ uri: pickedFile.uri, fileName: pickedFile.name }),
  ) as NonEmptyArray<FileToCopy>;
  const localCopiedFiles = await keepLocalCopy({ destination: 'cachesDirectory', files: filesToCopy });
  const { filesWithLocalUri, unknownSizeFileCount } = resolvePickedFilesFromLocalCopies(
    readablePickedFiles,
    localCopiedFiles,
  );
  notifyUnreadablePickedFiles(unreadablePickedFiles.length + unknownSizeFileCount);

  return filesWithLocalUri;
};
