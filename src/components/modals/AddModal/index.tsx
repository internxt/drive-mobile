import React, { useState } from 'react';
import { View, Text, Alert, Platform, PermissionsAndroid, TouchableHighlight } from 'react-native';
import {
  launchCameraAsync,
  requestCameraPermissionsAsync,
  requestMediaLibraryPermissionsAsync,
} from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import DocumentPicker, { DocumentPickerResponse } from 'react-native-document-picker';
import { launchImageLibrary } from 'react-native-image-picker';
import RNFS from 'react-native-fs';

import uploadService, { FileEntry } from '../../../services/UploadService';
import analytics, { AnalyticsEventKey } from '../../../services/AnalyticsService';
import { encryptFilename, isValidFilename } from '../../../helpers';
import fileSystemService from '../../../services/FileSystemService';
import strings from '../../../../assets/lang/strings';
import { DevicePlatform, NotificationType, ProgressCallback } from '../../../types';
import asyncStorage from '../../../services/AsyncStorageService';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { uiActions } from '../../../store/slices/ui';
import { driveActions, driveSelectors, driveThunks } from '../../../store/slices/drive';
import network from '../../../network';
import notificationsService from '../../../services/NotificationsService';
import { Camera, FileArrowUp, FolderSimplePlus, ImageSquare } from 'phosphor-react-native';
import BottomModal from '../BottomModal';
import { UploadingFile, UPLOAD_FILE_SIZE_LIMIT } from '../../../types/drive';
import { constants } from '../../../services/AppService';
import CreateFolderModal from '../CreateFolderModal';
import { useTailwind } from 'tailwind-rn';
import AppText from '../../AppText';
import useGetColor from '../../../hooks/useColor';
import { storageSelectors } from 'src/store/slices/storage';
import drive from '@internxt-mobile/services/drive';
function AddModal(): JSX.Element {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const dispatch = useAppDispatch();
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const { showUploadModal } = useAppSelector((state) => state.ui);
  const { folderContent } = useAppSelector((state) => state.drive);
  const { id: currentFolderId } = useAppSelector(driveSelectors.navigationStackPeek);
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
    setShowCreateFolderModal(false);
    await dispatch(driveThunks.getFolderContentThunk({ folderId: currentFolderId }));
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

    fileSystemService.unlink(destPath).catch(() => null);

    return createdFileEntry;
  }

  async function uploadAndCreateFileEntry(
    filePath: string,
    fileName: string,
    fileExtension: string,
    currentFolderId: number,
    progressCallback: ProgressCallback,
  ) {
    const { bucket, bridgeUser, mnemonic, userId } = await asyncStorage.getUser();
    const fileStat = await fileSystemService.stat(filePath);
    const fileSize = fileStat.size;
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
      () => null,
    );

    const folderId = currentFolderId;
    const name = encryptFilename(drive.file.removeExtension(fileName), folderId.toString());
    const fileEntry: FileEntry = {
      fileId,
      file_id: fileId,
      type: fileExtension,
      bucket,
      size: fileSize as unknown as number,
      folder_id: folderId.toString(),
      name,
      encrypt_version: '03-aes',
    };

    return uploadService.createFileEntry(fileEntry);
  }
  const upload = async (uploadingFile: UploadingFile, fileType: 'document' | 'image') => {
    function progressCallback(progress: number) {
      dispatch(driveActions.uploadFileSetProgress({ progress, id: uploadingFile.id }));
    }

    if (!isValidFilename(uploadingFile.name)) {
      throw new Error('This file name is not valid');
    }
    if (uploadingFile.size + usage > limit) {
      dispatch(uiActions.setShowRunOutSpaceModal(true));
      throw new Error(strings.errors.storageLimitReached);
    }

    if (Platform.OS === 'ios') {
      await uploadIOS(uploadingFile, fileType, progressCallback);
    } else if (Platform.OS === 'android') {
      await uploadAndroid(uploadingFile, fileType, progressCallback);
    } else {
      throw new Error('Unsuported platform');
    }
  };

  async function trackUploadStart() {
    const { uuid, email } = await asyncStorage.getUser();
    const uploadStartedTrack = { userId: uuid, email, device: DevicePlatform.Mobile };

    analytics.track(AnalyticsEventKey.FileUploadStart, uploadStartedTrack);
  }

  async function trackUploadSuccess() {
    const { email, uuid } = await asyncStorage.getUser();
    const uploadFinishedTrack = { userId: uuid, email, device: DevicePlatform.Mobile };

    analytics.track(AnalyticsEventKey.FileUploadFinished, uploadFinishedTrack);
  }

  async function trackUploadError(err: Error) {
    const { email, uuid } = await asyncStorage.getUser();
    const uploadErrorTrack = { userId: uuid, email, device: DevicePlatform.Mobile, error: err.message };

    analytics.track(AnalyticsEventKey.FileUploadError, uploadErrorTrack);
  }

  function uploadSuccess(id: number) {
    trackUploadSuccess();

    dispatch(driveActions.uploadingFileEnd(id));
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
      parentId: currentFolderId,
      createdAt: new Date().toString(),
      updatedAt: new Date().toString(),
      size: file.size,
      progress: 0,
    };
  }

  async function uploadDocuments(documents: DocumentPickerResponse[]) {
    const filesToUpload: DocumentPickerResponse[] = [];
    const filesExcluded: DocumentPickerResponse[] = [];
    const formattedFiles: UploadingFile[] = [];

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
          parentId: currentFolderId,
          createdAt: new Date().toString(),
          updatedAt: new Date().toString(),
          size: fileToUpload.size,
          progress: 0,
        };
      }

      trackUploadStart();
      dispatch(driveActions.uploadFileStart(file.name));
      dispatch(driveActions.addUploadingFile({ ...file }));

      formattedFiles.push(file);
      filesAtSameLevel.push({ name: file.name, type: file.type });
    }

    if (Platform.OS === 'android') {
      await fileSystemService.clearTempDir();
    }
    for (const file of formattedFiles) {
      await upload(file, 'document')
        .then(() => {
          uploadSuccess(file.id);
        })
        .catch((err) => {
          trackUploadError(err);
          dispatch(driveActions.uploadFileFailed({ errorMessage: err.message, id: file.id }));
          notificationsService.show({
            type: NotificationType.Error,
            text1: strings.formatString(strings.errors.uploadFile, err.message) as string,
          });
        })
        .finally(() => {
          dispatch(driveActions.uploadFileFinished());
        });
    }
  }

  function handleUploadFiles() {
    if (Platform.OS === 'ios') {
      DocumentPicker.pickMultiple({
        type: [DocumentPicker.types.allFiles],
        copyTo: 'cachesDirectory',
      })
        .then((documents) => {
          documents.forEach((doc) => (doc.uri = doc.fileCopyUri));
          dispatch(uiActions.setShowUploadFileModal(false));
          return uploadDocuments(documents);
        })
        .then(() => {
          dispatch(driveThunks.loadUsageThunk());

          if (currentFolderId) {
            dispatch(driveThunks.getFolderContentThunk({ folderId: currentFolderId }));
          }
        })
        .catch((err) => {
          if (err.message === 'User canceled document picker') {
            return;
          }

          notificationsService.show({
            type: NotificationType.Error,
            text1: strings.formatString(strings.errors.uploadFile, err.message) as string,
          });
        })
        .finally(() => {
          dispatch(uiActions.setShowUploadFileModal(false));
        });
    } else {
      DocumentPicker.pickMultiple({
        type: [DocumentPicker.types.allFiles],
        copyTo: 'cachesDirectory',
      })
        .then(processFilesFromPicker)
        .then(() => {
          dispatch(driveThunks.loadUsageThunk());

          if (currentFolderId) {
            dispatch(driveThunks.getFolderContentThunk({ folderId: currentFolderId }));
          }
        })
        .catch((err) => {
          if (err.message === 'User canceled document picker') {
            return;
          }
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

  async function handleUploadFromCameraRoll() {
    if (Platform.OS === 'ios') {
      const { status } = await requestMediaLibraryPermissionsAsync(false);

      if (status === 'granted') {
        launchImageLibrary({ mediaType: 'mixed', selectionLimit: 0 }, async (response) => {
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
                size: asset.fileSize || typeof stat.size === 'string' ? parseInt(stat.size) : stat.size,
                type: asset.type || '',
                uri: asset.uri || '',
              });
            }

            dispatch(uiActions.setShowUploadFileModal(false));
            uploadDocuments(documents)
              .then(() => {
                dispatch(driveThunks.loadUsageThunk());

                if (currentFolderId) {
                  dispatch(driveThunks.getFolderContentThunk({ folderId: currentFolderId }));
                }
              })
              .catch((err) => {
                if (err.message === 'User canceled document picker') {
                  return;
                }
                notificationsService.show({
                  type: NotificationType.Error,
                  text1: strings.formatString(strings.errors.uploadFile, err.message) as string,
                });
              })
              .finally(() => {
                dispatch(uiActions.setShowUploadFileModal(false));
              });
          }
        });
      }
    } else {
      DocumentPicker.pickMultiple({
        type: [DocumentPicker.types.images],
        copyTo: 'cachesDirectory',
      })
        .then(processFilesFromPicker)
        .then(() => {
          dispatch(driveThunks.loadUsageThunk());

          if (currentFolderId) {
            dispatch(driveThunks.getFolderContentThunk({ folderId: currentFolderId }));
          }
        })
        .catch((err) => {
          if (err.message === 'User canceled document picker') {
            return;
          }
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

  async function handleTakePhotoAndUpload() {
    const { status } = await requestCameraPermissionsAsync();

    if (status === 'granted') {
      try {
        const result = await launchCameraAsync();

        if (!result) {
          return;
        }

        if (!result.cancelled) {
          const name = drive.file.removeExtension(result.uri.split('/').pop() as string);
          const fileInfo = await FileSystem.getInfoAsync(result.uri);
          const size = fileInfo.size;
          const file: UploadingFile = {
            id: new Date().getTime(),
            name,
            parentId: currentFolderId,
            createdAt: new Date().toString(),
            updatedAt: new Date().toString(),
            type: drive.file.getExtensionFromUri(result.uri) as string,
            size: size || 0,
            uri: result.uri,
            progress: 0,
          };

          trackUploadStart();
          dispatch(driveActions.uploadFileStart(file.name));
          dispatch(driveActions.addUploadingFile(file));
          dispatch(uiActions.setShowUploadFileModal(false));

          upload(file, 'image')
            .then(() => {
              uploadSuccess(file.id);
            })
            .catch((err) => {
              trackUploadError(err);
              dispatch(driveActions.uploadFileFailed({ id: file.id }));
              throw err;
            })
            .finally(() => {
              dispatch(driveActions.uploadFileFinished());
              dispatch(driveThunks.loadUsageThunk());

              if (currentFolderId) {
                dispatch(driveThunks.getFolderContentThunk({ folderId: currentFolderId }));
              }
            });
        }
      } catch (err) {
        notificationsService.show({
          type: NotificationType.Error,
          text1: strings.formatString(strings.errors.uploadFile, (err as Error).message) as string,
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
          <View style={tailwind('rounded-xl overflow-hidden')}>
            <TouchableHighlight
              style={tailwind('flex-grow')}
              underlayColor={getColor('text-neutral-80')}
              onPress={() => {
                handleUploadFiles();
              }}
            >
              <View style={tailwind('flex-row flex-grow bg-white h-12 pl-4 items-center justify-between')}>
                <Text style={tailwind('text-lg text-neutral-500')}>{strings.buttons.uploadFiles}</Text>
                <View style={tailwind('p-3.5 items-center justify-center')}>
                  <FileArrowUp color={getColor('text-neutral-500')} size={20} />
                </View>
              </View>
            </TouchableHighlight>

            <View style={tailwind('flex-grow h-px bg-neutral-20')}></View>

            <TouchableHighlight
              style={tailwind('flex-grow')}
              underlayColor={getColor('text-neutral-80')}
              onPress={() => {
                handleUploadFromCameraRoll();
              }}
            >
              <View style={tailwind('flex-row flex-grow bg-white h-12 pl-4 items-center justify-between')}>
                <Text style={tailwind('text-lg text-neutral-500')}>{strings.buttons.uploadFromCameraRoll}</Text>
                <View style={tailwind('p-3.5 items-center justify-center')}>
                  <ImageSquare color={getColor('text-neutral-500')} size={20} />
                </View>
              </View>
            </TouchableHighlight>

            <View style={tailwind('flex-grow h-px bg-neutral-20')}></View>

            <TouchableHighlight
              style={tailwind('flex-grow')}
              underlayColor={getColor('text-neutral-80')}
              onPress={() => {
                handleTakePhotoAndUpload();
              }}
            >
              <View style={tailwind('flex-row flex-grow bg-white h-12 pl-4 items-center justify-between')}>
                <Text style={tailwind('text-lg text-neutral-500')}>{strings.buttons.takeAPhotoAnUpload}</Text>
                <View style={tailwind('p-3.5 items-center justify-center')}>
                  <Camera color={getColor('text-neutral-500')} size={20} />
                </View>
              </View>
            </TouchableHighlight>

            <View style={tailwind('flex-grow h-px bg-neutral-20')}></View>

            <TouchableHighlight
              style={tailwind('flex-grow')}
              underlayColor={getColor('text-neutral-80')}
              onPress={() => {
                setShowCreateFolderModal(true);
                dispatch(uiActions.setShowUploadFileModal(false));
              }}
            >
              <View style={tailwind('flex-row flex-grow bg-white h-12 pl-4 items-center justify-between')}>
                <Text style={tailwind('text-lg text-neutral-500')}>{strings.buttons.newFolder}</Text>
                <View style={tailwind('p-3.5 items-center justify-center')}>
                  <FolderSimplePlus color={getColor('text-neutral-500')} size={20} />
                </View>
              </View>
            </TouchableHighlight>
          </View>

          <View style={tailwind('mt-3.5 rounded-xl overflow-hidden')}>
            <TouchableHighlight
              style={tailwind('flex-grow')}
              underlayColor={getColor('text-neutral-80')}
              onPress={() => {
                dispatch(uiActions.setShowUploadFileModal(false));
              }}
            >
              <View style={tailwind('flex-row flex-grow bg-white h-12 items-center justify-center')}>
                <AppText medium style={tailwind('text-lg text-neutral-500')}>
                  {strings.buttons.cancel}
                </AppText>
              </View>
            </TouchableHighlight>
          </View>
        </View>
      </BottomModal>
      <CreateFolderModal
        isOpen={showCreateFolderModal}
        currentFolderId={currentFolderId}
        onClose={onCloseCreateFolderModal}
        onCancel={onCancelCreateFolderModal}
        onFolderCreated={onFolderCreated}
      />
    </>
  );
}

export default AddModal;
