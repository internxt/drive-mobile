import * as RNFS from '@dr.pogodin/react-native-fs';
import * as FileSystem from 'expo-file-system';
import {
  launchCameraAsync,
  requestCameraPermissionsAsync,
  requestMediaLibraryPermissionsAsync,
} from 'expo-image-picker';
import { useState } from 'react';
import { Alert, PermissionsAndroid, Platform, TouchableHighlight, View } from 'react-native';
import DocumentPicker, { DocumentPickerResponse } from 'react-native-document-picker';

import { launchImageLibrary } from 'react-native-image-picker';

import { useDrive } from '@internxt-mobile/hooks/drive';
import { imageService, logger } from '@internxt-mobile/services/common';
import { uploadService } from '@internxt-mobile/services/common/network/upload/upload.service';
import drive from '@internxt-mobile/services/drive';
import errorService from '@internxt-mobile/services/ErrorService';
import { DriveFileData, EncryptionVersion, FileEntry, Thumbnail } from '@internxt/sdk/dist/drive/storage/types';
import { SaveFormat } from 'expo-image-manipulator';
import { Camera, FileArrowUp, FolderSimplePlus, ImageSquare } from 'phosphor-react-native';
import uuid from 'react-native-uuid';
import { SLEEP_BECAUSE_MAYBE_BACKEND_IS_NOT_RETURNING_FRESHLY_MODIFIED_OR_CREATED_ITEMS_YET } from 'src/helpers/services';
import { storageSelectors } from 'src/store/slices/storage';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../../assets/lang/strings';
import { encryptFilename, isValidFilename } from '../../../helpers';
import useGetColor from '../../../hooks/useColor';
import network from '../../../network';
import analytics, { DriveAnalyticsEvent } from '../../../services/AnalyticsService';
import { constants } from '../../../services/AppService';
import asyncStorage from '../../../services/AsyncStorageService';
import fileSystemService from '../../../services/FileSystemService';
import notificationsService from '../../../services/NotificationsService';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { driveActions, driveThunks } from '../../../store/slices/drive';
import { uiActions } from '../../../store/slices/ui';
import { NotificationType, ProgressCallback } from '../../../types';
import { DriveEventKey, UPLOAD_FILE_SIZE_LIMIT, UploadingFile } from '../../../types/drive';
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
  const { folderContent } = useAppSelector((state) => state.drive);
  const { focusedFolder } = useDrive();

  const { limit } = useAppSelector((state) => state.storage);
  const usage = useAppSelector(storageSelectors.usage);

  async function uploadIOS(file: UploadingFile, fileType: 'document' | 'image', progressCallback: ProgressCallback) {
    const name = decodeURI(file.uri).split('/').pop() || '';
    const regex = /^(.*:\/{0,2})\/?(.*)$/gm;
    const fileUri = file.uri.replace(regex, '$2');
    const extension = file.type;
    const finalUri = uploadService.getFinalUri(fileUri, fileType);
    const fileURI = finalUri;
    const fileExtension = extension;

    return uploadAndCreateFileEntry(fileURI, name, fileExtension, file.parentId, progressCallback);
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
    await driveCtx.loadFolderContent(focusedFolder.id, { pullFrom: ['network'], resetPagination: true });
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
      fileToUpload.parentId,
      progressCallback,
    );

    dispatch(driveActions.uploadingFileEnd(fileToUpload.id));
    fileSystemService.unlink(destPath).catch(() => null);

    return createdFileEntry;
  }

  /**
   * TODO: This function does a lot of stuff, we should
   * separate things in smaller units so this code can be
   * more maintenable
   */
  async function uploadAndCreateFileEntry(
    filePath: string,
    fileName: string,
    fileExtension: string,
    currentFolderId: number,
    progressCallback: ProgressCallback,
  ) {
    const { bucket, bridgeUser, mnemonic, userId } = await asyncStorage.getUser();
    logger.info('Stating file...');
    const fileStat = await fileSystemService.stat(filePath);
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

    const folderId = currentFolderId;
    const plainName = drive.file.removeExtension(fileName);
    logger.info('Encrypting filename...');
    const name = encryptFilename(plainName, folderId.toString());
    logger.info('Filename encrypted');
    const fileEntry: FileEntry = {
      type: fileExtension,
      bucket,
      size: parseInt(fileSize),
      folder_id: folderId,
      name,
      encrypt_version: EncryptionVersion.Aes03,
      id: fileId,
      plain_name: plainName,
    };
    let uploadedThumbnail: Thumbnail | null = null;
    const generatedDriveItem = await uploadService.createFileEntry(fileEntry);

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
          file_id: generatedDriveItem.id,
          max_width: generatedThumbnail.width,
          max_height: generatedThumbnail.height,
          type: generatedThumbnail.type,
          size: generatedThumbnail.size,
          bucket_id: bucket,
          bucket_file: thumbnailFileId,
          encrypt_version: EncryptionVersion.Aes03,
        });
      }
    } catch (error) {
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
  }

  function processFilesFromPicker(documents: DocumentPickerResponse[]): Promise<void> {
    documents.forEach((doc) => (doc.uri = doc.fileCopyUri));
    dispatch(uiActions.setShowUploadFileModal(false));

    return uploadDocuments(documents);
  }

  function toUploadingFile(
    filesAtSameLevel: { name: string; type: string }[],
    file: DocumentPickerResponse,
  ): UploadingFile {
    if (!focusedFolder) {
      throw new Error('No current folder found');
    }
    if (!isValidFilename(file.name)) {
      throw new Error('This file name is not valid');
    }
    const nameSplittedByDots = file.name.split('.');
    return {
      id: new Date().getTime(),
      uri: file.uri,
      name: drive.file.renameIfAlreadyExists(
        filesAtSameLevel,
        drive.file.removeExtension(file.name),
        drive.file.getExtensionFromUri(file.name) || '',
      )[2],
      type: nameSplittedByDots[nameSplittedByDots.length - 1] || '',
      parentId: focusedFolder.id,
      createdAt: new Date().toString(),
      updatedAt: new Date().toString(),
      size: file.size,
      progress: 0,
      uploaded: false,
    };
  }

  async function uploadDocuments(documents: DocumentPickerResponse[]) {
    const filesToUpload: DocumentPickerResponse[] = [];
    const filesExcluded: DocumentPickerResponse[] = [];
    const formattedFiles: UploadingFile[] = [];

    if (!focusedFolder) {
      throw new Error('No current folder found');
    }
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

    if (filesExcluded.length > 0) {
      Alert.alert(`${filesExcluded.length} files will not be uploaded. Max upload size per file is 1GB`);
    }

    // TODO: load files in current folder
    const filesAtSameLevel =
      folderContent
        ?.filter((item) => item.fileId)
        .map((file) => {
          return { name: drive.file.removeExtension(file.name), type: file.type };
        }) || [];

    for (const fileToUpload of filesToUpload) {
      let file: UploadingFile;

      if (Platform.OS === 'android') {
        file = toUploadingFile(filesAtSameLevel, fileToUpload);
      } else {
        file = {
          id: new Date().getTime(),
          uri: fileToUpload.uri,
          name: drive.file.renameIfAlreadyExists(
            filesAtSameLevel,
            drive.file.removeExtension(fileToUpload.name),
            drive.file.getExtensionFromUri(fileToUpload.name) || '',
          )[2],
          type: drive.file.getExtensionFromUri(fileToUpload.uri) || '',
          parentId: focusedFolder.id,
          createdAt: new Date().toString(),
          updatedAt: new Date().toString(),
          size: fileToUpload.size,
          progress: 0,
          uploaded: false,
        };
      }

      trackUploadStart(file);
      dispatch(driveActions.uploadFileStart(file.name));
      dispatch(driveActions.addUploadingFile({ ...file }));

      formattedFiles.push(file);
      filesAtSameLevel.push({ name: file.name, type: file.type });
    }

    for (const file of formattedFiles) {
      try {
        await uploadFile(file, 'document');
        uploadSuccess(file);
      } catch (e) {
        const err = e as Error;
        errorService.reportError(err as Error, {
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
        driveCtx.loadFolderContent(focusedFolder.id, { pullFrom: ['network'], resetPagination: true });
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
      const { status } = await requestMediaLibraryPermissionsAsync(false);

      if (status === 'granted') {
        launchImageLibrary(
          { mediaType: 'mixed', selectionLimit: MAX_FILES_BULK_UPLOAD, assetRepresentationMode: 'current' },
          async (response) => {
            if (response.errorMessage) {
              return Alert.alert(response.errorMessage);
            }
            if (response.assets) {
              const documents: DocumentPickerResponse[] = [];

              for (const asset of response.assets) {
                const decodedURI = decodeURIComponent(asset.uri as string);
                const stat = await RNFS.stat(decodedURI);

                documents.push({
                  fileCopyUri: asset.uri || '',
                  name: decodeURIComponent(
                    asset.fileName || asset.uri?.substring((asset.uri || '').lastIndexOf('/') + 1) || '',
                  ),
                  size: asset.fileSize || stat.size,
                  type: asset.type || '',
                  uri: asset.uri || '',
                });
              }

              dispatch(uiActions.setShowUploadFileModal(false));
              uploadDocuments(documents)
                .then(() => {
                  dispatch(driveThunks.loadUsageThunk());

                  if (focusedFolder) {
                    driveCtx.loadFolderContent(focusedFolder.id);
                  }
                })
                .catch((err) => {
                  if (err.message === 'User canceled document picker') {
                    return;
                  }

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
          },
        );
      }
    } else {
      DocumentPicker.pickMultiple({
        type: [DocumentPicker.types.images],
        copyTo: 'cachesDirectory',
      })
        .then(processFilesFromPicker)
        .then(() => {
          dispatch(driveThunks.loadUsageThunk());

          if (focusedFolder) {
            driveCtx.loadFolderContent(focusedFolder.id, { pullFrom: ['network'], resetPagination: true });
          }
        })
        .catch((err) => {
          if (err.message === 'User canceled document picker') {
            return;
          }

          logger.error('Error on hadleUploadFromCameraRoll function:', JSON.stringify(err));

          notificationsService.show({
            type: NotificationType.Error,
            text1: strings.formatString(strings.errors.uploadFile, err.message) as string,
          });
        })
        .finally(() => {
          dispatch(uiActions.setShowUploadFileModal(false));
        });
    }
  }

  /**
   * Take a Photo and upload it
   */
  async function handleTakePhotoAndUpload() {
    const { status } = await requestCameraPermissionsAsync();

    if (status === 'granted') {
      if (!focusedFolder) {
        throw new Error('No current folder found');
      }
      try {
        const result = await launchCameraAsync();
        const assetToUpload = result.assets?.pop();
        if (!assetToUpload) {
          return;
        }

        if (!result.canceled) {
          const name = drive.file.removeExtension(assetToUpload.uri.split('/').pop() as string);
          const fileInfo = await FileSystem.getInfoAsync(assetToUpload.uri);
          const size = fileInfo.exists ? fileInfo?.size : 0;
          const file: UploadingFile = {
            id: new Date().getTime(),
            name,
            parentId: focusedFolder.id,
            createdAt: new Date().toString(),
            updatedAt: new Date().toString(),
            type: drive.file.getExtensionFromUri(assetToUpload.uri) as string,
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
              driveCtx.loadFolderContent(focusedFolder.id, { pullFrom: ['network'], resetPagination: true });
            }
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
          <View style={tailwind('rounded-2xl bg-white overflow-hidden')}>
            <TouchableHighlight
              style={tailwind('flex-grow')}
              underlayColor={getColor('text-gray-40')}
              onPress={() => {
                handleUploadFiles();
              }}
            >
              <View style={tailwind('flex-row flex-grow bg-white px-2 items-center justify-between')}>
                <View style={tailwind('p-3.5 pl-2 items-center justify-center')}>
                  <FileArrowUp color={getColor('text-gray-100')} size={24} />
                </View>
                <AppText style={tailwind('text-lg flex-1 text-gray-100')}>{strings.buttons.uploadFiles}</AppText>
              </View>
            </TouchableHighlight>

            <View style={tailwind('flex-grow h-px bg-gray-10 mx-4')}></View>

            <TouchableHighlight
              style={tailwind('flex-grow')}
              underlayColor={getColor('text-gray-20')}
              onPress={() => {
                handleUploadFromCameraRoll();
              }}
            >
              <View style={tailwind('flex-row flex-grow bg-white px-2 items-center justify-between')}>
                <View style={tailwind('p-3.5 pl-2 items-center justify-center')}>
                  <ImageSquare color={getColor('text-gray-100')} size={24} />
                </View>
                <AppText style={tailwind('text-lg flex-1 text-gray-100')}>
                  {strings.buttons.uploadFromCameraRoll}
                </AppText>
              </View>
            </TouchableHighlight>

            <View style={tailwind('flex-grow h-px bg-gray-10 mx-4')}></View>

            <TouchableHighlight
              style={tailwind('flex-grow')}
              underlayColor={getColor('text-gray-40')}
              onPress={() => {
                handleTakePhotoAndUpload();
              }}
            >
              <View style={tailwind('flex-row flex-grow bg-white px-2 items-center justify-between')}>
                <View style={tailwind('p-3.5 pl-2 items-center justify-center')}>
                  <Camera color={getColor('text-gray-100')} size={24} />
                </View>
                <AppText style={tailwind('text-lg flex-1 text-gray-100')}>{strings.buttons.takeAPhotoAnUpload}</AppText>
              </View>
            </TouchableHighlight>

            <View style={tailwind('flex-grow h-px bg-gray-10 mx-4')}></View>

            <TouchableHighlight
              style={tailwind('flex-grow')}
              underlayColor={getColor('text-gray-40')}
              onPress={() => {
                dispatch(uiActions.setShowUploadFileModal(false));
                setShowCreateFolderModal(true);
              }}
            >
              <View style={tailwind('flex-row flex-grow bg-white px-2 items-center justify-between')}>
                <View style={tailwind('p-3.5 pl-2 items-center justify-center')}>
                  <FolderSimplePlus color={getColor('text-gray-100')} size={24} />
                </View>
                <AppText style={tailwind('text-lg flex-1 text-gray-100')}>{strings.buttons.newFolder}</AppText>
              </View>
            </TouchableHighlight>
          </View>

          <View style={tailwind('mt-4 rounded-2xl overflow-hidden')}>
            <TouchableHighlight
              style={tailwind('flex-grow')}
              underlayColor={getColor('text-gray-40')}
              onPress={() => {
                dispatch(uiActions.setShowUploadFileModal(false));
              }}
            >
              <View style={tailwind('flex-row flex-grow bg-white p-3.5 items-center justify-center')}>
                <AppText medium style={tailwind('text-lg text-gray-100')}>
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
          currentFolderId={focusedFolder.id}
          onClose={onCloseCreateFolderModal}
          onCancel={onCancelCreateFolderModal}
          onFolderCreated={onFolderCreated}
        />
      ) : null}
    </>
  );
}

export default AddModal;
