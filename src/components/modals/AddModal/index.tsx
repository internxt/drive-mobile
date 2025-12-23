import * as FileSystem from 'expo-file-system';
import {
  ImagePickerAsset,
  launchCameraAsync,
  launchImageLibraryAsync,
  MediaTypeOptions,
  requestCameraPermissionsAsync,
  UIImagePickerPreferredAssetRepresentationMode,
} from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { useState } from 'react';
import { Alert, PermissionsAndroid, Platform, TouchableHighlight, View } from 'react-native';
import DocumentPicker, { DocumentPickerResponse } from 'react-native-document-picker';

import { useDrive } from '@internxt-mobile/hooks/drive';
import { imageService, logger } from '@internxt-mobile/services/common';
import { uploadService } from '@internxt-mobile/services/common/network/upload/upload.service';
import drive from '@internxt-mobile/services/drive';
import {
  generateFileName,
  isTemporaryFileName,
  parseExifDate,
} from '@internxt-mobile/services/drive/file/utils/exifHelpers';
import errorService from '@internxt-mobile/services/ErrorService';
import { DriveFileData, EncryptionVersion, FileEntryByUuid, Thumbnail } from '@internxt/sdk/dist/drive/storage/types';
import { SaveFormat } from 'expo-image-manipulator';
import { Camera, FileArrowUp, FolderSimplePlus, ImageSquare } from 'phosphor-react-native';
import uuid from 'react-native-uuid';
import { SLEEP_BECAUSE_MAYBE_BACKEND_IS_NOT_RETURNING_FRESHLY_MODIFIED_OR_CREATED_ITEMS_YET } from 'src/helpers/services';
import { storageSelectors } from 'src/store/slices/storage';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../../assets/lang/strings';
import { isValidFilename } from '../../../helpers';
import useGetColor from '../../../hooks/useColor';
import network from '../../../network';
import analytics, { DriveAnalyticsEvent } from '../../../services/AnalyticsService';
import { constants } from '../../../services/AppService';
import asyncStorage from '../../../services/AsyncStorageService';
import {
  createUploadingFiles,
  handleDuplicateFiles,
  initializeUploads,
  prepareUploadFiles,
  showFileSizeAlert,
  uploadSingleFile,
  validateAndFilterFiles,
} from '../../../services/drive/file/utils/uploadFileUtils';
import fileSystemService from '../../../services/FileSystemService';
import notificationsService from '../../../services/NotificationsService';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { driveActions, driveThunks } from '../../../store/slices/drive';
import { uiActions } from '../../../store/slices/ui';
import { NotificationType, ProgressCallback } from '../../../types';
import { DocumentPickerFile, DriveEventKey, UPLOAD_FILE_SIZE_LIMIT, UploadingFile } from '../../../types/drive';
import AppText from '../../AppText';
import BottomModal from '../BottomModal';
import CreateFolderModal from '../CreateFolderModal';

const MAX_FILES_BULK_UPLOAD = 25;

function AddModal(): JSX.Element {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const driveCtx = useDrive();
  const dispatch = useAppDispatch();
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const { showUploadModal } = useAppSelector((state) => state.ui);
  const { focusedFolder } = useDrive();

  const { limit } = useAppSelector((state) => state.storage);
  const usage = useAppSelector(storageSelectors.usage);

  async function uploadIOS(file: UploadingFile, fileType: 'document' | 'image', progressCallback: ProgressCallback) {
    const name = file.name ?? decodeURI(file.uri).split('/').pop();
    const regex = /^(.*:\/{0,2})\/?(.*)$/gm;
    const fileUri = file.uri.replace(regex, '$2');
    const extension = file.type;
    const finalUri = uploadService.getFinalUri(fileUri, fileType);
    const fileURI = finalUri;
    const fileExtension = extension;
    return uploadAndCreateFileEntry(fileURI, name, fileExtension, file.parentUuid, progressCallback);
  }

  const onCloseCreateFolderModal = () => {
    setShowCreateFolderModal(false);
  };

  const onCancelCreateFolderModal = () => {
    setShowCreateFolderModal(false);
  };

  const onFolderCreated = async () => {
    if (!focusedFolder) {
      throw new Error('No current folder found');
    }
    setShowCreateFolderModal(false);
    await SLEEP_BECAUSE_MAYBE_BACKEND_IS_NOT_RETURNING_FRESHLY_MODIFIED_OR_CREATED_ITEMS_YET(500);
    await driveCtx.loadFolderContent(focusedFolder.uuid, {
      pullFrom: ['network'],
      resetPagination: true,
    });
  };

  async function uploadAndroid(
    fileToUpload: UploadingFile,
    fileType: 'document' | 'image',
    progressCallback: ProgressCallback,
  ) {
    const name = fileToUpload.name || drive.file.getNameFromUri(fileToUpload.uri);
    const destPath = fileSystemService.tmpFilePath(name);

    await fileSystemService.copyFile(fileToUpload.uri, destPath);

    if (fileType === 'document') {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE, {
        title: 'Files Permission',
        message: 'Internxt needs access to your files in order to upload documents',
        buttonNegative: strings.buttons.cancel,
        buttonPositive: strings.buttons.grant,
      });

      if (!granted) {
        Alert.alert('Can not upload files. Grant permissions to upload files');
        return;
      }
    }
    const fileExtension = fileToUpload.type;

    const createdFileEntry = await uploadAndCreateFileEntry(
      destPath,
      name,
      fileExtension,
      fileToUpload.parentUuid,
      progressCallback,
      fileToUpload.modificationTime,
      fileToUpload.creationTime,
    );

    dispatch(driveActions.uploadingFileEnd(fileToUpload.id));
    fileSystemService.unlink(destPath).catch(() => null);

    return createdFileEntry;
  }

  const checkFileSizeLimitToUpload = (fileSize: number, fileName: string) => {
    if (fileSize >= UPLOAD_FILE_SIZE_LIMIT) {
      const messageKey = strings.messages.uploadFileLimitName;

      const alertText = strings.formatString(messageKey, fileName).toString();
      Alert.alert(strings.messages.limitPerFile, alertText);
      return false;
    }
    return true;
  };

  /**
   * TODO: This function does a lot of stuff, we should
   * separate things in smaller units so this code can be
   * more maintenable
   */
  async function uploadAndCreateFileEntry(
    filePath: string,
    fileName: string,
    fileExtension: string,
    currentFolderId: string,
    progressCallback: ProgressCallback,
    modificationTime?: string,
    creationTime?: string,
  ) {
    const { bucket, bridgeUser, mnemonic, userId } = await asyncStorage.getUser();
    logger.info('Stating file...');
    const fileStat = await fileSystemService.stat(filePath);
    // Fix for Android, native document picker not returns the correct fileSize when file is big
    // and cannnot get the stat before we got the file in temporary path
    const isFileSizeValid = checkFileSizeLimitToUpload(fileStat.size, fileName);
    if (!isFileSizeValid) {
      return;
    }

    logger.info('File stats: ', JSON.stringify(fileStat));
    const fileSize = fileStat.size;
    logger.info('About to upload file...');
    const fileId = await network.uploadFile(
      filePath,
      bucket,
      mnemonic,
      constants.BRIDGE_URL,
      {
        user: bridgeUser,
        pass: userId,
      },
      {
        notifyProgress: progressCallback,
      },
    );
    logger.info('File uploaded with fileId: ', fileId);
    logger.info('File uploaded with name: ', fileName);
    logger.info('File uploaded with modificationTime: ', modificationTime);
    logger.info('File uploaded with creationTime: ', creationTime);

    const folderId = currentFolderId;
    const plainName = fileName;
    const modTimestamp = modificationTime ?? fileStat.mtime;
    const modificationTimeISO = modTimestamp ? new Date(modTimestamp).toISOString() : undefined;

    const createTimestamp = creationTime ?? fileStat.ctime;
    const creationTimeISO = createTimestamp ? new Date(createTimestamp).toISOString() : undefined;

    const fileEntryByUuid: FileEntryByUuid = {
      fileId: fileId,
      type: fileExtension,
      size: fileSize,
      plainName: plainName,
      bucket,
      folderUuid: folderId,
      encryptVersion: EncryptionVersion.Aes03,
      modificationTime: modificationTimeISO,
      creationTime: creationTimeISO,
    };

    let uploadedThumbnail: Thumbnail | null = null;
    const generatedDriveItem = await uploadService.createFileEntry(fileEntryByUuid);

    // If thumbnail generation fails, don't block the upload, we can
    // try thumbnail generation later
    try {
      const generatedThumbnail = await imageService.generateThumbnail(filePath.replace(/ /g, '%20'), {
        extension: fileExtension,
        thumbnailFormat: SaveFormat.JPEG,
        // Android needs an extension to generate the thumbnails, otherwise it crashes
        // jpg is the one that we use for thumbanil generations
        outputPath: fileSystemService.tmpFilePath(`${uuid.v4()}.${SaveFormat.JPEG}`),
      });

      if (generatedThumbnail) {
        const thumbnailFileId = await network.uploadFile(
          generatedThumbnail.path,
          bucket,
          mnemonic,
          constants.BRIDGE_URL,
          {
            user: bridgeUser,
            pass: userId,
          },
          {},
        );

        uploadedThumbnail = await uploadService.createThumbnailEntry({
          fileUuid: generatedDriveItem.uuid,
          maxWidth: generatedThumbnail.width,
          maxHeight: generatedThumbnail.height,
          type: generatedThumbnail.type,
          size: generatedThumbnail.size,
          bucketId: bucket,
          bucketFile: thumbnailFileId,
          encryptVersion: EncryptionVersion.Aes03,
        });
      }
    } catch (error) {
      logger.error('Error generating and uploading thumbnail: ', JSON.stringify(error));
      errorService.reportError(error);
    }

    drive.events.emit({ event: DriveEventKey.UploadCompleted });
    return {
      ...generatedDriveItem,
      thumbnails: uploadedThumbnail ? [uploadedThumbnail] : null,
    } as DriveFileData;
  }

  const uploadFile = async (uploadingFile: UploadingFile, fileType: 'document' | 'image') => {
    logger.info('Starting file upload process: ', JSON.stringify(uploadingFile));
    function progressCallback(progress: number) {
      dispatch(driveActions.uploadFileSetProgress({ progress, id: uploadingFile.id }));
    }

    if (!isValidFilename(uploadingFile.name)) {
      logger.error(`File name is not valid: ${uploadingFile.name}`);
      throw new Error('This file name is not valid');
    }
    logger.info(`File name is valid: ${uploadingFile.name}`);
    if (uploadingFile.size + usage > limit) {
      logger.error(`File size is bigger than user available Internxt storage: New -> ${uploadingFile.size + usage}`);
      dispatch(uiActions.setShowRunOutSpaceModal(true));
      throw new Error(strings.errors.storageLimitReached);
    }

    logger.info(`File size fits into user available Internxt storage: New -> ${uploadingFile.size + usage}`);

    try {
      logger.info('Starting file upload process');
      if (Platform.OS === 'ios') {
        await uploadIOS(uploadingFile, fileType, progressCallback);
      } else if (Platform.OS === 'android') {
        await uploadAndroid(uploadingFile, fileType, progressCallback);
      } else {
        throw new Error('Unsuported platform');
      }
      logger.info('File upload process finished');
      dispatch(driveActions.uploadingFileEnd(uploadingFile.id));
    } catch (error) {
      logger.error('File upload process failed: ', JSON.stringify(error));
      errorService.reportError(error);
      throw error;
    }

    drive.events.emit({ event: DriveEventKey.UploadCompleted });
  };

  async function trackUploadStart(file: UploadingFile) {
    await analytics.track(DriveAnalyticsEvent.FileUploadStarted, { size: file.size, type: file.type });
  }

  async function trackUploadSuccess(file: UploadingFile) {
    await analytics.track(DriveAnalyticsEvent.FileUploadCompleted, {
      size: file.size,
      type: file.type,
      file_id: file.id,
      parent_folder_id: file.parentId,
    });
  }

  async function trackUploadError(file: UploadingFile, err: Error) {
    await analytics.track(DriveAnalyticsEvent.FileUploadError, {
      message: err.message,
      size: file.size,
      type: file.type,
    });
  }

  function uploadSuccess(file: UploadingFile) {
    trackUploadSuccess(file);

    dispatch(driveActions.uploadingFileEnd(file.id));
    dispatch(driveActions.setUri(undefined));

    drive.events.emit({ event: DriveEventKey.UploadCompleted });
  }

  function processFilesFromPicker(documents: DocumentPickerFile[]): Promise<void> {
    documents.forEach((doc) => (doc.uri = doc.fileCopyUri));
    dispatch(uiActions.setShowUploadFileModal(false));

    return uploadDocuments(documents);
  }

  async function uploadDocuments(documents: DocumentPickerFile[]) {
    if (!focusedFolder) {
      throw new Error('No current folder found');
    }

    const { filesToUpload, filesExcluded } = validateAndFilterFiles(documents);
    showFileSizeAlert(filesExcluded);
    const filesToProcess = await handleDuplicateFiles(filesToUpload, focusedFolder.uuid);
    if (filesToProcess.length === 0) {
      dispatch(uiActions.setShowUploadFileModal(false));
      return;
    }

    const preparedFiles = await prepareUploadFiles(filesToProcess, focusedFolder.uuid);
    const formattedFiles = createUploadingFiles(preparedFiles, focusedFolder);

    initializeUploads(formattedFiles, dispatch);

    for (const file of formattedFiles) {
      await uploadSingleFile(file, dispatch, uploadFile, uploadSuccess);
    }

    dispatch(driveActions.clearUploadedFiles());
  }

  /**
   * Upload multiple files
   */
  const handleUploadFiles = async () => {
    try {
      // 1. Get the files from the picker
      const pickedFiles = await DocumentPicker.pickMultiple({
        type: [DocumentPicker.types.allFiles],
        copyTo: 'cachesDirectory',
        mode: 'import',
      });

      const exceedsMaxFileUpload = pickedFiles.length > MAX_FILES_BULK_UPLOAD;

      if (exceedsMaxFileUpload) {
        Alert.alert(
          strings.messages.maxBulkUploadReached.title,
          strings.formatString(strings.messages.maxBulkUploadReached.message, MAX_FILES_BULK_UPLOAD) as string,
        );
        return;
      }

      // 2. Add them to the uploader
      await processFilesFromPicker(pickedFiles);
      dispatch(driveThunks.loadUsageThunk());

      // 3. Refresh the current folder
      if (focusedFolder) {
        await SLEEP_BECAUSE_MAYBE_BACKEND_IS_NOT_RETURNING_FRESHLY_MODIFIED_OR_CREATED_ITEMS_YET(500);
        driveCtx.loadFolderContent(focusedFolder.uuid, {
          pullFrom: ['network'],
          resetPagination: true,
        });
      }
    } catch (err) {
      const error = err as Error;
      if (error.message === 'User canceled document picker') {
        return;
      }

      errorService.reportError(error);
      logger.error('Error on handleUploadFiles function:', JSON.stringify(err));

      notificationsService.show({
        type: NotificationType.Error,
        text1: strings.formatString(strings.errors.uploadFile, error.message) as string,
      });
    } finally {
      // 4. Hide the upload modal
      dispatch(uiActions.setShowUploadFileModal(false));
    }
  };

  /**
   * Upload a photo/video from device gallery
   */
  async function handleUploadFromCameraRoll() {
    if (Platform.OS === 'ios') {
      const { status } = await MediaLibrary.requestPermissionsAsync();

      if (status === 'granted') {
        try {
          const result = await launchImageLibraryAsync({
            mediaTypes: MediaTypeOptions.All,
            allowsMultipleSelection: true,
            selectionLimit: MAX_FILES_BULK_UPLOAD,
            allowsEditing: false,
            preferredAssetRepresentationMode: UIImagePickerPreferredAssetRepresentationMode.Current,
            base64: false,
            exif: false,
          });

          if (!result.canceled && result.assets) {
            const documents: DocumentPickerResponse[] = [];

            for (const asset of result.assets) {
              try {
                const assetInfo = await MediaLibrary.getAssetInfoAsync(asset.assetId || asset.uri);
                const cleanUri = assetInfo.mediaType === 'video' ? asset.uri : assetInfo.localUri || asset.uri;
                const originalFileName = assetInfo.filename || asset.fileName;

                let fileSize = asset.fileSize;
                if (!fileSize) {
                  try {
                    const fileInfo = await FileSystem.getInfoAsync(cleanUri);
                    fileSize = fileInfo.exists ? fileInfo.size || 0 : 0;
                  } catch (error) {
                    logger.warn('The file size could not be obtained:', error);
                    fileSize = 0;
                  }
                }

                documents.push({
                  fileCopyUri: cleanUri,
                  name: decodeURIComponent(originalFileName ?? ''),
                  size: fileSize,
                  type: drive.file.getExtensionFromUri(cleanUri)?.toLowerCase() ?? '',
                  uri: cleanUri,
                });
              } catch (error) {
                logger.error('Error obtaining original asset info:', error);
                const cleanUri = asset.uri;
                const fallbackName = generateFileName(cleanUri);

                documents.push({
                  fileCopyUri: cleanUri,
                  name: fallbackName,
                  size: asset.fileSize ?? 0,
                  type: asset.type ?? '',
                  uri: cleanUri,
                });
              }
            }

            dispatch(uiActions.setShowUploadFileModal(false));

            uploadDocuments(documents)
              .then(async () => {
                dispatch(driveThunks.loadUsageThunk());

                if (focusedFolder) {
                  await SLEEP_BECAUSE_MAYBE_BACKEND_IS_NOT_RETURNING_FRESHLY_MODIFIED_OR_CREATED_ITEMS_YET(500);
                  driveCtx.loadFolderContent(focusedFolder.uuid, {
                    pullFrom: ['network'],
                    resetPagination: true,
                  });
                }
              })
              .catch((err) => {
                logger.error('Error on handleUploadFromCameraRoll function:', JSON.stringify(err));
                notificationsService.show({
                  type: NotificationType.Error,
                  text1: strings.formatString(strings.errors.uploadFile, err.message) as string,
                });
              })
              .finally(() => {
                dispatch(uiActions.setShowUploadFileModal(false));
              });
          }
        } catch (error) {
          logger.error('Error accessing media library:', error);
        }
      }
    } else {
      const { status } = await MediaLibrary.requestPermissionsAsync();

      if (status === 'granted') {
        try {
          const result = await launchImageLibraryAsync({
            mediaTypes: MediaTypeOptions.All,
            allowsMultipleSelection: true,
            selectionLimit: MAX_FILES_BULK_UPLOAD,
            allowsEditing: false,
            preferredAssetRepresentationMode: UIImagePickerPreferredAssetRepresentationMode.Current,
            exif: true,
            base64: false,
          });

          if (result.canceled || !result.assets?.length) return;

          const documents: DocumentPickerFile[] = [];

          for (const asset of result.assets) {
            try {
              const cleanUri = asset.uri;
              let originalFileName = asset.fileName;
              const exif = asset.exif || null;

              const creationTime = parseExifDate(exif?.DateTimeOriginal);
              const modificationTime = parseExifDate(exif?.DateTime);
              if (isTemporaryFileName(originalFileName)) {
                originalFileName = generateFileName(cleanUri, creationTime, modificationTime);
              }

              let fileSize = asset.fileSize ?? 0;
              if (!fileSize) {
                try {
                  const fileInfo = await FileSystem.getInfoAsync(cleanUri);
                  fileSize = fileInfo.exists ? fileInfo.size || 0 : 0;
                } catch (error) {
                  logger.warn('The file size could not be obtained:', error);
                  fileSize = 0;
                }
              }

              documents.push({
                fileCopyUri: cleanUri,
                name: decodeURIComponent(originalFileName ?? ''),
                size: fileSize,
                type: drive.file.getExtensionFromUri(cleanUri)?.toLowerCase() ?? '',
                uri: cleanUri,
                creationTime,
                modificationTime,
              });
            } catch (error) {
              logger.error('Error obtaining original asset info:', error);
              const cleanUri = asset.uri;
              const fallbackName = generateFileName(cleanUri);

              documents.push({
                fileCopyUri: cleanUri,
                name: fallbackName,
                size: asset.fileSize ?? 0,
                type: asset.type ?? '',
                uri: cleanUri,
              });
            }
          }

          dispatch(uiActions.setShowUploadFileModal(false));

          uploadDocuments(documents)
            .then(async () => {
              dispatch(driveThunks.loadUsageThunk());

              if (focusedFolder) {
                await SLEEP_BECAUSE_MAYBE_BACKEND_IS_NOT_RETURNING_FRESHLY_MODIFIED_OR_CREATED_ITEMS_YET(500);
                driveCtx.loadFolderContent(focusedFolder.uuid, {
                  pullFrom: ['network'],
                  resetPagination: true,
                });
              }
            })
            .catch((err) => {
              logger.error('Error on handleUploadFromCameraRoll (Android):', JSON.stringify(err));
              notificationsService.show({
                type: NotificationType.Error,
                text1: strings.formatString(strings.errors.uploadFile, err.message) as string,
              });
            })
            .finally(() => {
              dispatch(uiActions.setShowUploadFileModal(false));
            });
        } catch (error) {
          logger.error('Error accessing media library (Android):', error);
        }
      }
    }
  }

  const detectImageFormat = (asset: ImagePickerAsset) => {
    const fileName = asset.fileName || '';
    const extension = fileName.split('.').pop()?.toLowerCase() || '';

    const isHEIC = extension === 'heic' || extension === 'heif';

    return {
      extension,
      isHEIC,
      fileName: asset.fileName,
      mimeType: asset.type,
    };
  };

  async function handleTakePhotoAndUpload() {
    const { status } = await requestCameraPermissionsAsync();

    if (status === 'granted') {
      if (!focusedFolder) {
        throw new Error('No current folder found');
      }
      try {
        const result = await launchCameraAsync({
          mediaTypes: MediaTypeOptions.All,
          quality: 1,
          allowsEditing: false,
          preferredAssetRepresentationMode: UIImagePickerPreferredAssetRepresentationMode.Current,
        });

        const assetToUpload = result.assets?.pop();
        if (!assetToUpload || result.canceled) {
          return;
        }

        const fileInfo = await FileSystem.getInfoAsync(assetToUpload.uri);
        const formatInfo = detectImageFormat(assetToUpload);
        const name = drive.file.removeExtension(assetToUpload.uri.split('/').pop() as string);
        const size = fileInfo.exists ? fileInfo?.size : 0;

        const file: UploadingFile = {
          id: new Date().getTime(),
          uuid: uuid.v4().toString(),
          name,
          parentId: focusedFolder.id,
          parentUuid: focusedFolder.uuid,
          createdAt: new Date().toString(),
          updatedAt: new Date().toString(),
          type: formatInfo.isHEIC
            ? 'heic'
            : (drive.file.getExtensionFromUri(assetToUpload.uri) as string)?.toLowerCase(),
          size: size,
          uri: assetToUpload.uri,
          progress: 0,
          uploaded: false,
        };

        trackUploadStart(file);
        dispatch(driveActions.uploadFileStart(file.name));
        dispatch(driveActions.addUploadingFile(file));
        dispatch(uiActions.setShowUploadFileModal(false));

        try {
          await uploadFile(file, 'image');
          await uploadSuccess(file);
        } catch (err) {
          trackUploadError(file, err as Error);
          dispatch(driveActions.uploadFileFailed({ id: file.id }));
          throw err;
        } finally {
          dispatch(driveActions.uploadFileFinished());
          dispatch(driveThunks.loadUsageThunk());

          if (focusedFolder) {
            await SLEEP_BECAUSE_MAYBE_BACKEND_IS_NOT_RETURNING_FRESHLY_MODIFIED_OR_CREATED_ITEMS_YET(500);
            driveCtx.loadFolderContent(focusedFolder.uuid, {
              pullFrom: ['network'],
              resetPagination: true,
            });
          }
        }
      } catch (error) {
        logger.error('Error on handleTakePhotoAndUpload function:', JSON.stringify(error));

        notificationsService.show({
          type: NotificationType.Error,
          text1: strings.formatString(strings.errors.uploadFile, (error as Error)?.message) as string,
        });
      }
    }
  }

  return (
    <>
      <BottomModal
        safeAreaColor="transparent"
        style={tailwind('bg-transparent')}
        isOpen={showUploadModal}
        onClosed={() => {
          dispatch(uiActions.setShowUploadFileModal(false));
        }}
      >
        <View style={tailwind('p-4')}>
          <View style={[tailwind('rounded-2xl overflow-hidden'), { backgroundColor: getColor('bg-surface') }]}>
            <TouchableHighlight
              style={tailwind('flex-grow')}
              underlayColor={getColor('bg-gray-5')}
              onPress={() => {
                handleUploadFiles();
              }}
            >
              <View
                style={[
                  tailwind('flex-row flex-grow px-2 items-center justify-between'),
                  { backgroundColor: getColor('bg-surface') },
                ]}
              >
                <View style={tailwind('p-3.5 pl-2 items-center justify-center')}>
                  <FileArrowUp color={getColor('text-gray-100')} size={24} />
                </View>
                <AppText style={[tailwind('text-lg flex-1'), { color: getColor('text-gray-100') }]}>
                  {strings.buttons.uploadFiles}
                </AppText>
              </View>
            </TouchableHighlight>

            <View style={[tailwind('flex-grow h-px mx-4'), { backgroundColor: getColor('bg-gray-10') }]}></View>

            <TouchableHighlight
              style={tailwind('flex-grow')}
              underlayColor={getColor('bg-gray-5')}
              onPress={() => {
                handleUploadFromCameraRoll();
              }}
            >
              <View
                style={[
                  tailwind('flex-row flex-grow px-2 items-center justify-between'),
                  { backgroundColor: getColor('bg-surface') },
                ]}
              >
                <View style={tailwind('p-3.5 pl-2 items-center justify-center')}>
                  <ImageSquare color={getColor('text-gray-100')} size={24} />
                </View>
                <AppText style={[tailwind('text-lg flex-1'), { color: getColor('text-gray-100') }]}>
                  {strings.buttons.uploadFromCameraRoll}
                </AppText>
              </View>
            </TouchableHighlight>

            <View style={[tailwind('flex-grow h-px mx-4'), { backgroundColor: getColor('bg-gray-10') }]}></View>

            <TouchableHighlight
              style={tailwind('flex-grow')}
              underlayColor={getColor('bg-gray-5')}
              onPress={() => {
                handleTakePhotoAndUpload();
              }}
            >
              <View
                style={[
                  tailwind('flex-row flex-grow px-2 items-center justify-between'),
                  { backgroundColor: getColor('bg-surface') },
                ]}
              >
                <View style={tailwind('p-3.5 pl-2 items-center justify-center')}>
                  <Camera color={getColor('text-gray-100')} size={24} />
                </View>
                <AppText style={[tailwind('text-lg flex-1'), { color: getColor('text-gray-100') }]}>
                  {strings.buttons.takeAPhotoAnUpload}
                </AppText>
              </View>
            </TouchableHighlight>

            <View style={[tailwind('flex-grow h-px mx-4'), { backgroundColor: getColor('bg-gray-10') }]}></View>

            <TouchableHighlight
              style={tailwind('flex-grow')}
              underlayColor={getColor('bg-gray-5')}
              onPress={() => {
                dispatch(uiActions.setShowUploadFileModal(false));
                setShowCreateFolderModal(true);
              }}
            >
              <View
                style={[
                  tailwind('flex-row flex-grow px-2 items-center justify-between'),
                  { backgroundColor: getColor('bg-surface') },
                ]}
              >
                <View style={tailwind('p-3.5 pl-2 items-center justify-center')}>
                  <FolderSimplePlus color={getColor('text-gray-100')} size={24} />
                </View>
                <AppText style={[tailwind('text-lg flex-1'), { color: getColor('text-gray-100') }]}>
                  {strings.buttons.newFolder}
                </AppText>
              </View>
            </TouchableHighlight>
          </View>

          <View style={[tailwind('mt-4 rounded-2xl overflow-hidden'), { backgroundColor: getColor('bg-surface') }]}>
            <TouchableHighlight
              style={tailwind('flex-grow')}
              underlayColor={getColor('bg-gray-5')}
              onPress={() => {
                dispatch(uiActions.setShowUploadFileModal(false));
              }}
            >
              <View
                style={[
                  tailwind('flex-row flex-grow p-3.5 items-center justify-center'),
                  { backgroundColor: getColor('bg-surface') },
                ]}
              >
                <AppText medium style={[tailwind('text-lg'), { color: getColor('text-gray-100') }]}>
                  {strings.buttons.cancel}
                </AppText>
              </View>
            </TouchableHighlight>
          </View>
        </View>
      </BottomModal>
      {focusedFolder ? (
        <CreateFolderModal
          isOpen={showCreateFolderModal}
          currentFolderUuid={focusedFolder.uuid}
          onClose={onCloseCreateFolderModal}
          onCancel={onCancelCreateFolderModal}
          onFolderCreated={onFolderCreated}
        />
      ) : null}
    </>
  );
}

export default AddModal;
