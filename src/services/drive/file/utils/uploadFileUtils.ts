import { Alert } from 'react-native';
import { DocumentPickerResponse } from 'react-native-document-picker';
import uuid from 'react-native-uuid';
import strings from '../../../../../assets/lang/strings';
import { isValidFilename } from '../../../../helpers';
import { driveActions } from '../../../../store/slices/drive';
import { UPLOAD_FILE_SIZE_LIMIT, UploadingFile } from '../../../../types/drive';
import { checkDuplicatedFiles, File } from './checkDuplicatedFiles';
import { FileToUpload, prepareFilesToUpload } from './prepareFilesToUpload';

import errorService from '../../../ErrorService';

import { Dispatch } from 'react';
import { DriveFoldersTreeNode } from '../../../../contexts/Drive';
import { NotificationType } from '../../../../types';
import { DocumentPickerFile } from '../../../../types/drive';
import analyticsService, { DriveAnalyticsEvent } from '../../../AnalyticsService';
import { logger } from '../../../common';
import notificationsService from '../../../NotificationsService';

/**
 * Validate file names and filter out files exceeding the upload size limit.
 *
 * @param {DocumentPickerFile[]} documents - Array of selected documents.
 * @returns {{ filesToUpload: DocumentPickerFile[], filesExcluded: DocumentPickerFile[] }}
 */
export function validateAndFilterFiles(documents: DocumentPickerFile[]) {
  const filesToUpload: DocumentPickerFile[] = [];
  const filesExcluded: DocumentPickerFile[] = [];

  if (!documents.every((file) => isValidFilename(file.name))) {
    throw new Error('Some file names are not valid');
  }

  for (const file of documents) {
    if (file.size <= UPLOAD_FILE_SIZE_LIMIT) {
      filesToUpload.push(file);
    } else {
      filesExcluded.push(file);
    }
  }

  return { filesToUpload, filesExcluded };
}

/**
 * Show an alert when some files exceed the upload size limit.
 *
 * @param {DocumentPickerFile[]} filesExcluded - Files that were excluded due to size.
 */
export function showFileSizeAlert(filesExcluded: DocumentPickerFile[]) {
  if (filesExcluded.length === 0) return;

  const messageKey = filesExcluded.length === 1 ? strings.messages.uploadFileLimit : strings.messages.uploadFilesLimit;
  const alertText = strings.formatString(messageKey, filesExcluded.length).toString();
  Alert.alert(strings.messages.limitPerFile, alertText);
}

/**
 * Handle duplicate files by checking for existing files in the target folder and optionally prompting the user.
 *
 * @param {DocumentPickerFile[]} files - Files to check for duplication.
 * @param {string} folderUuid - UUID of the destination folder.
 * @returns {Promise<DocumentPickerFile[]>} - Files to proceed with after handling duplicates.
 */
export async function handleDuplicateFiles(
  files: DocumentPickerFile[],
  folderUuid: string,
): Promise<DocumentPickerFile[]> {
  const mappedFiles = files.map((file) => ({
    ...file,
    type: file.type ?? '',
  }));

  const { filesWithoutDuplicates, filesWithDuplicates } = await checkDuplicatedFiles(mappedFiles, folderUuid);

  let filesToProcess = [...filesWithoutDuplicates] as DocumentPickerFile[];

  if (filesWithDuplicates.length > 0) {
    const shouldUploadDuplicates = await askUserAboutDuplicates(filesWithDuplicates);

    if (shouldUploadDuplicates) {
      filesToProcess = [...filesToProcess, ...(filesWithDuplicates as DocumentPickerFile[])];
    }
  }

  return filesToProcess;
}

/**
 * Prompt the user about uploading duplicate files.
 *
 * @param {File[]} filesWithDuplicates - Array of duplicate file metadata.
 * @returns {Promise<boolean>} - Whether the user chooses to upload duplicates.
 */
export async function askUserAboutDuplicates(filesWithDuplicates: File[]): Promise<boolean> {
  const duplicatedFileNames = filesWithDuplicates.map((f) => f.name).join(', ');
  const message = strings.modals.duplicatedFiles.duplicateFilesMessage.replace('%s', duplicatedFileNames);

  return new Promise<boolean>((resolve) => {
    Alert.alert(
      strings.modals.duplicatedFiles.duplicateFilesTitle,
      message,
      [
        {
          text: strings.buttons.cancel,
          onPress: () => resolve(false),
          style: 'cancel',
        },
        {
          text: strings.modals.duplicatedFiles.duplicateFilesAction,
          onPress: () => resolve(true),
        },
      ],
      { cancelable: false },
    );
  });
}

/**
 * Prepare files to be uploaded by resolving metadata and paths.
 *
 * @param {DocumentPickerResponse[]} files - Files to prepare.
 * @param {string} folderUuid - UUID of the destination folder.
 * @returns {Promise<FileToUpload[]>} - Prepared file objects ready for upload.
 */
export async function prepareUploadFiles(files: DocumentPickerResponse[], folderUuid: string): Promise<FileToUpload[]> {
  const { filesToUpload: preparedFiles } = await prepareFilesToUpload({
    files,
    parentFolderUuid: folderUuid,
    disableDuplicatedNamesCheck: false,
    disableExistenceCheck: false,
  });

  return preparedFiles;
}

/**
 * Convert prepared files into UploadingFile format.
 *
 * @param {FileToUpload[]} preparedFiles - Files returned from preparation step.
 * @param {DriveFoldersTreeNode} focusedFolder - Folder context in which files are being uploaded.
 * @returns {UploadingFile[]} - Files formatted for upload state tracking.
 */
export function createUploadingFiles(
  preparedFiles: FileToUpload[],
  focusedFolder: DriveFoldersTreeNode,
): UploadingFile[] {
  const formattedFiles: UploadingFile[] = [];

  for (const preparedFile of preparedFiles) {
    const fileToUpload: UploadingFile = {
      id: new Date().getTime() + Math.random(),
      uuid: uuid.v4().toString(),
      uri: preparedFile.uri,
      name: preparedFile.name,
      type: preparedFile.type,
      parentId: focusedFolder.id,
      parentUuid: focusedFolder.uuid,
      createdAt: new Date().toString(),
      updatedAt: new Date().toString(),
      size: preparedFile.size,
      progress: 0,
      uploaded: false,
      modificationTime: preparedFile.modificationTime,
      creationTime: preparedFile.creationTime,
    };

    formattedFiles.push(fileToUpload);
  }

  return formattedFiles;
}

/**
 * Initialize the upload process for each file, including tracking and dispatching actions.
 *
 * @param {UploadingFile[]} files - Files to upload.
 * @param {Function} dispatch - Redux dispatch function.
 */
export function initializeUploads(files: UploadingFile[], dispatch: Dispatch<any>) {
  for (const file of files) {
    trackUploadStart(file);
    dispatch(driveActions.uploadFileStart(file.name));
    dispatch(driveActions.addUploadingFile({ ...file }));
  }
}

async function trackUploadStart(file: UploadingFile) {
  await analyticsService.track(DriveAnalyticsEvent.FileUploadStarted, { size: file.size, type: file.type });
}
async function trackUploadError(file: UploadingFile, err: Error) {
  await analyticsService.track(DriveAnalyticsEvent.FileUploadError, {
    message: err.message,
    size: file.size,
    type: file.type,
  });
}

/**
 * Upload a single file, handle errors, and update Redux state accordingly.
 *
 * @param {UploadingFile} file - The file to upload.
 * @param {Function} dispatch - Redux dispatch function.
 * @param {(uploadingFile: UploadingFile, fileType: 'document' | 'image') => Promise<void>} uploadFile - Upload function.
 * @param {(file: UploadingFile) => void} uploadSuccess - Callback for successful upload.
 */
export async function uploadSingleFile(
  file: UploadingFile,
  dispatch: Dispatch<any>,
  uploadFile: (uploadingFile: UploadingFile, fileType: 'document' | 'image') => Promise<void>,
  uploadSuccess: (file: UploadingFile) => void,
) {
  try {
    await uploadFile(file, 'document');
    uploadSuccess(file);
  } catch (e) {
    const err = e as Error;
    errorService.reportError(err, {
      extra: {
        fileId: file.id,
      },
    });
    trackUploadError(file, err);
    dispatch(driveActions.uploadFileFailed({ errorMessage: err.message, id: file.id }));
    logger.error('File upload process failed: ', JSON.stringify(err));
    notificationsService.show({
      type: NotificationType.Error,
      text1: strings.formatString(strings.errors.uploadFile, err.message) as string,
    });
  } finally {
    dispatch(driveActions.uploadFileFinished());
  }
}
