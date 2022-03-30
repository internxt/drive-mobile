import React from 'react';
import { View, Text, Alert, Platform, PermissionsAndroid, TouchableHighlight } from 'react-native';
import { uniqueId } from 'lodash';
import {
  launchCameraAsync,
  requestCameraPermissionsAsync,
  requestMediaLibraryPermissionsAsync,
} from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import DocumentPicker, { DocumentPickerResponse } from 'react-native-document-picker';
import { launchImageLibrary } from 'react-native-image-picker';
import RNFS from 'react-native-fs';

import { createFileEntry, FileEntry, getFinalUri } from '../../../services/upload';
import analytics, { AnalyticsEventKey } from '../../../services/analytics';
import { encryptFilename } from '../../../helpers';
import { stat, getTemporaryDir, copyFile, unlink, clearTempDir } from '../../../services/fileSystem';
import { getExtensionFromUri, removeExtension, renameIfAlreadyExists } from '../../../services/file';
import strings from '../../../../assets/lang/strings';
import { tailwind, getColor } from '../../../helpers/designSystem';
import globalStyle from '../../../styles';
import { DevicePlatform, NotificationType } from '../../../types';
import { deviceStorage } from '../../../services/asyncStorage';
import { UPLOAD_FILE_SIZE_LIMIT } from '../../../services/file';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { uiActions } from '../../../store/slices/ui';
import { storageActions, storageThunks } from '../../../store/slices/storage';
import { constants } from '../../../services/app';
import { uploadFile } from '../../../services/network';
import notificationsService from '../../../services/notifications';
import { Camera, FileArrowUp, FolderSimplePlus, ImageSquare } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomModal from '../BottomModal';

interface UploadingFile {
  size: number;
  progress: number;
  name: string;
  type: string;
  currentFolder: any;
  createdAt: string;
  updatedAt: string;
  id: string;
  uri: string;
  folderId?: number;
}

type ProgressCallback = (progress: number) => void;

async function uploadIOS(res: UploadingFile, fileType: 'document' | 'image', progressCallback: ProgressCallback) {
  const result = { ...res };

  // Set name for pics/photos
  if (!result.name) {
    result.name = result.uri.split('/').pop() || '';
  }

  const regex = /^(.*:\/{0,2})\/?(.*)$/gm;
  const fileUri = result.uri.replace(regex, '$2');
  const extension = fileUri.split('.').pop() || '';
  const finalUri = getFinalUri(fileUri, fileType);

  const fileURI = finalUri;
  const filename = result.name;
  const fileExtension = extension;
  const currentFolderId = result.currentFolder.toString();

  return uploadAndCreateFileEntry(fileURI, filename, fileExtension, currentFolderId, progressCallback);
}

async function uploadAndroid(res: UploadingFile, fileType: 'document' | 'image', progressCallback: ProgressCallback) {
  const result = { ...res };

  // Set name for pics/photos
  if (!result.name) {
    result.name = result.uri.split('/').pop() || '';
  }

  const destPath = `${getTemporaryDir()}/${result.name}`;
  await copyFile(result.uri, destPath);

  if (fileType === 'document') {
    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE, {
      title: 'Files Permission',
      message: 'Internxt needs access to your files in order to upload documents',
      buttonNegative: strings.components.buttons.cancel,
      buttonPositive: strings.components.buttons.grant,
    });

    if (!granted) {
      Alert.alert('Can not upload files. Grant permissions to upload files');
      return;
    }
  }

  const filename = result.name;
  const fileExtension = result.type;
  const currenFolderId = result.currentFolder.toString();

  const createdFileEntry = await uploadAndCreateFileEntry(
    destPath,
    filename,
    fileExtension,
    currenFolderId,
    progressCallback,
  );

  unlink(destPath).catch(() => null);

  return createdFileEntry;
}

async function uploadAndCreateFileEntry(
  filePath: string,
  fileName: string,
  fileExtension: string,
  currentFolderId: string,
  progressCallback: ProgressCallback,
) {
  const { bucket, bridgeUser, mnemonic, userId } = await deviceStorage.getUser();
  const fileStat = await stat(filePath);
  const fileSize = fileStat.size;
  const fileId = await uploadFile(
    filePath,
    bucket,
    constants.REACT_NATIVE_BRIDGE_URL,
    {
      encryptionKey: mnemonic,
      user: bridgeUser,
      password: userId,
    },
    {
      progress: progressCallback,
    },
  );

  const folderId = currentFolderId;
  const name = encryptFilename(removeExtension(fileName), folderId);
  const fileEntry: FileEntry = {
    fileId,
    file_id: fileId,
    type: fileExtension,
    bucket,
    size: fileSize as number,
    folder_id: folderId,
    name,
    encrypt_version: '03-aes',
  };

  return createFileEntry(fileEntry);
}

function UploadModal(): JSX.Element {
  const dispatch = useAppDispatch();
  const safeAreaInsets = useSafeAreaInsets();
  const { folderContent, usage: storageUsage, limit, currentFolderId } = useAppSelector((state) => state.storage);
  const { showUploadModal } = useAppSelector((state) => state.ui);
  const { usage: photosUsage } = useAppSelector((state) => state.photos);
  const usage = photosUsage + storageUsage;
  const upload = async (uploadingFile: UploadingFile, fileType: 'document' | 'image') => {
    function progressCallback(progress: number) {
      dispatch(storageActions.uploadFileSetProgress({ progress, id: uploadingFile.id }));
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
    const { uuid, email } = await deviceStorage.getUser();
    const uploadStartedTrack = { userId: uuid, email, device: DevicePlatform.Mobile };

    analytics.track(AnalyticsEventKey.FileUploadStart, uploadStartedTrack);
  }

  async function trackUploadSuccess() {
    const { email, uuid } = await deviceStorage.getUser();
    const uploadFinishedTrack = { userId: uuid, email, device: DevicePlatform.Mobile };

    analytics.track(AnalyticsEventKey.FileUploadFinished, uploadFinishedTrack);
  }

  async function trackUploadError(err: Error) {
    const { email, uuid } = await deviceStorage.getUser();
    const uploadErrorTrack = { userId: uuid, email, device: DevicePlatform.Mobile, error: err.message };

    analytics.track(AnalyticsEventKey.FileUploadError, uploadErrorTrack);
  }

  function uploadSuccess(file: { id: string }) {
    trackUploadSuccess();

    dispatch(storageActions.removeUploadingFile(file.id));
    dispatch(storageActions.updateUploadingFile(file.id));
    dispatch(storageActions.setUri(undefined));
  }

  function processFilesFromPicker(documents: any[]): Promise<void> {
    documents.forEach((doc) => (doc.uri = doc.fileCopyUri));
    dispatch(uiActions.setShowUploadFileModal(false));

    return uploadDocuments(documents);
  }

  function toUploadingFile(
    filesAtSameLevel: { name: string; type: string }[],
    file: DocumentPickerResponse,
  ): UploadingFile {
    const nameSplittedByDots = file.name.split('.');

    return {
      uri: file.uri,
      name: renameIfAlreadyExists(
        filesAtSameLevel,
        removeExtension(file.name),
        getExtensionFromUri(file.name) || '',
      )[2],
      type: nameSplittedByDots[nameSplittedByDots.length - 1] || '',
      currentFolder: currentFolderId,
      createdAt: new Date().toString(),
      updatedAt: new Date().toString(),
      id: uniqueId(),
      size: file.size,
      progress: 0,
    };
  }

  async function uploadDocuments(documents: DocumentPickerResponse[]) {
    const filesToUpload: DocumentPickerResponse[] = [];
    const filesExcluded: DocumentPickerResponse[] = [];
    const formattedFiles: UploadingFile[] = [];

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
      folderContent?.files.map((file) => {
        return { name: removeExtension(file.name), type: file.type };
      }) || [];

    for (const fileToUpload of filesToUpload) {
      let file: UploadingFile;

      if (Platform.OS === 'android') {
        file = toUploadingFile(filesAtSameLevel, fileToUpload);
      } else {
        file = {
          uri: fileToUpload.uri,
          name: renameIfAlreadyExists(
            filesAtSameLevel,
            removeExtension(fileToUpload.name),
            getExtensionFromUri(fileToUpload.name) || '',
          )[2],
          type: getExtensionFromUri(fileToUpload.uri) || '',
          currentFolder: currentFolderId,
          createdAt: new Date().toString(),
          updatedAt: new Date().toString(),
          id: uniqueId(),
          size: fileToUpload.size,
          progress: 0,
        };
      }

      trackUploadStart();
      dispatch(storageActions.uploadFileStart(file.name));
      dispatch(storageActions.addUploadingFile({ ...file, isLoading: true }));

      formattedFiles.push(file);
      filesAtSameLevel.push({ name: file.name, type: file.type });
    }

    if (Platform.OS === 'android') {
      await clearTempDir();
    }
    for (const file of formattedFiles) {
      await upload(file, 'document')
        .then(() => {
          uploadSuccess(file);
        })
        .catch((err) => {
          trackUploadError(err);
          dispatch(storageActions.uploadFileFailed({ errorMessage: err.message, id: file.id }));
          notificationsService.show({
            type: NotificationType.Error,
            text1: strings.formatString(strings.errors.uploadFile, err.message) as string,
          });
        })
        .finally(() => {
          dispatch(storageActions.uploadFileFinished());
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
          dispatch(storageThunks.getUsageAndLimitThunk());

          if (currentFolderId) {
            dispatch(storageThunks.getFolderContentThunk({ folderId: currentFolderId }));
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
          dispatch(storageThunks.getUsageAndLimitThunk());

          if (currentFolderId) {
            dispatch(storageThunks.getFolderContentThunk({ folderId: currentFolderId }));
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
              const stat = await RNFS.stat(decodeURIComponent(asset.uri as string));

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
                dispatch(storageThunks.getUsageAndLimitThunk());

                if (currentFolderId) {
                  dispatch(storageThunks.getFolderContentThunk({ folderId: currentFolderId }));
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
          dispatch(storageThunks.getUsageAndLimitThunk());

          if (currentFolderId) {
            dispatch(storageThunks.getFolderContentThunk({ folderId: currentFolderId }));
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
          const name = removeExtension(result.uri.split('/').pop() as string);
          const fileInfo = await FileSystem.getInfoAsync(result.uri);
          const size = fileInfo.size;
          const file: UploadingFile = {
            name,
            progress: 0,
            currentFolder: currentFolderId,
            createdAt: new Date().toString(),
            updatedAt: new Date().toString(),
            id: uniqueId(),
            type: getExtensionFromUri(result.uri) as string,
            size: size || 0,
            uri: result.uri,
          };

          trackUploadStart();
          dispatch(storageActions.uploadFileStart(file.name));
          dispatch(storageActions.addUploadingFile(file));

          dispatch(uiActions.setShowUploadFileModal(false));

          upload(file, 'image')
            .then(() => {
              uploadSuccess(file);
            })
            .catch((err) => {
              trackUploadError(err);
              dispatch(storageActions.uploadFileFailed({ id: file.id }));
              throw err;
            })
            .finally(() => {
              dispatch(storageActions.uploadFileFinished());
              dispatch(storageThunks.getUsageAndLimitThunk());

              if (currentFolderId) {
                dispatch(storageThunks.getFolderContentThunk({ folderId: currentFolderId }));
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
    <BottomModal
      containerStyle={{ ...tailwind('bg-transparent'), paddingBottom: safeAreaInsets.bottom }}
      isOpen={showUploadModal}
      onClosed={() => {
        dispatch(uiActions.setShowUploadFileModal(false));
      }}
    >
      <View style={tailwind('p-4')}>
        <View style={tailwind('rounded-xl overflow-hidden')}>
          <TouchableHighlight
            style={tailwind('flex-grow')}
            underlayColor={getColor('neutral-80')}
            onPress={() => {
              handleUploadFiles();
            }}
          >
            <View style={tailwind('flex-row flex-grow bg-white h-12 pl-4 items-center justify-between')}>
              <Text style={tailwind('text-lg text-neutral-500')}>{strings.components.buttons.uploadFiles}</Text>
              <View style={tailwind('p-3.5 items-center justify-center')}>
                <FileArrowUp color={getColor('neutral-500')} size={20} />
              </View>
            </View>
          </TouchableHighlight>

          <View style={tailwind('flex-grow h-px bg-neutral-20')}></View>

          <TouchableHighlight
            style={tailwind('flex-grow')}
            underlayColor={getColor('neutral-80')}
            onPress={() => {
              handleUploadFromCameraRoll();
            }}
          >
            <View style={tailwind('flex-row flex-grow bg-white h-12 pl-4 items-center justify-between')}>
              <Text style={tailwind('text-lg text-neutral-500')}>
                {strings.components.buttons.uploadFromCameraRoll}
              </Text>
              <View style={tailwind('p-3.5 items-center justify-center')}>
                <ImageSquare color={getColor('neutral-500')} size={20} />
              </View>
            </View>
          </TouchableHighlight>

          <View style={tailwind('flex-grow h-px bg-neutral-20')}></View>

          <TouchableHighlight
            style={tailwind('flex-grow')}
            underlayColor={getColor('neutral-80')}
            onPress={() => {
              handleTakePhotoAndUpload();
            }}
          >
            <View style={tailwind('flex-row flex-grow bg-white h-12 pl-4 items-center justify-between')}>
              <Text style={tailwind('text-lg text-neutral-500')}>{strings.components.buttons.takeAPhotoAnUpload}</Text>
              <View style={tailwind('p-3.5 items-center justify-center')}>
                <Camera color={getColor('neutral-500')} size={20} />
              </View>
            </View>
          </TouchableHighlight>

          <View style={tailwind('flex-grow h-px bg-neutral-20')}></View>

          <TouchableHighlight
            style={tailwind('flex-grow')}
            underlayColor={getColor('neutral-80')}
            onPress={() => {
              dispatch(uiActions.setShowCreateFolderModal(true));
              dispatch(uiActions.setShowUploadFileModal(false));
            }}
          >
            <View style={tailwind('flex-row flex-grow bg-white h-12 pl-4 items-center justify-between')}>
              <Text style={tailwind('text-lg text-neutral-500')}>{strings.components.buttons.newFolder}</Text>
              <View style={tailwind('p-3.5 items-center justify-center')}>
                <FolderSimplePlus color={getColor('neutral-500')} size={20} />
              </View>
            </View>
          </TouchableHighlight>
        </View>

        <View style={tailwind('mt-3.5 rounded-xl overflow-hidden')}>
          <TouchableHighlight
            style={tailwind('flex-grow')}
            underlayColor={getColor('neutral-80')}
            onPress={() => {
              dispatch(uiActions.setShowUploadFileModal(false));
            }}
          >
            <View style={tailwind('flex-row flex-grow bg-white h-12 items-center justify-center')}>
              <Text style={[tailwind('text-lg text-neutral-500'), globalStyle.fontWeight.medium]}>
                {strings.components.buttons.cancel}
              </Text>
            </View>
          </TouchableHighlight>
        </View>
      </View>
    </BottomModal>
  );
}

export default UploadModal;
