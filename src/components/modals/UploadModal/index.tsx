import React from 'react';
import {
  View,
  Text,
  Alert,
  Platform,
  PermissionsAndroid,
  TouchableWithoutFeedback,
  TouchableHighlight,
} from 'react-native';
import { uniqueId } from 'lodash';
import Modal from 'react-native-modalbox';
import {
  launchCameraAsync,
  requestCameraPermissionsAsync,
  requestMediaLibraryPermissionsAsync,
} from 'expo-image-picker';
import DocumentPicker, { DocumentPickerResponse } from 'react-native-document-picker';
import { launchImageLibrary } from 'react-native-image-picker';
import * as Unicons from '@iconscout/react-native-unicons';
import RNFS from 'react-native-fs';

import { createFileEntry, FileEntry, getFinalUri } from '../../../services/upload';
import analytics from '../../../services/analytics';
import { encryptFilename } from '../../../helpers';
import { stat, getTemporaryDir, copyFile, unlink, clearTempDir } from '../../../lib/fs';
import { renameIfAlreadyExists } from '../../../lib';
import strings from '../../../../assets/lang/strings';
import { notify } from '../../../services/toast';
import { tailwind, getColor } from '../../../helpers/designSystem';
import globalStyle from '../../../styles/global.style';
import { DevicePlatform } from '../../../types';
import { deviceStorage } from '../../../services/deviceStorage';
import { UPLOAD_FILES_LIMIT } from '../../../services/file';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { layoutActions } from '../../../store/slices/layout';
import { filesActions, filesThunks } from '../../../store/slices/files';
import { uploadFile } from '../../../services/network';

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
  path: string;
  folderId?: number;
}

function getFileExtension(uri: string) {
  const regex = /^(.*:\/{0,2})\/?(.*)$/gm;
  const fileUri = uri.replace(regex, '$2');

  return fileUri.split('.').pop();
}

function removeExtension(filename: string) {
  const filenameSplitted = filename.split('.');
  const extension = filenameSplitted && filenameSplitted.length > 1 ? (filenameSplitted.pop() as string) : '';

  if (extension === '') {
    return filename;
  }

  return filename.substring(0, filename.length - (extension.length + 1));
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
      buttonNegative: 'Cancel',
      buttonPositive: 'Grant',
    });

    if (!granted) {
      Alert.alert('Can not upload files. Grant permissions to upload files');
      return;
    }
  }

  const fileURI = 'file:///' + destPath;
  const filename = result.name;
  const fileExtension = result.type;
  const currenFolderId = result.currentFolder.toString();

  const createdFileEntry = await uploadAndCreateFileEntry(
    fileURI,
    filename,
    fileExtension,
    currenFolderId,
    progressCallback,
  );

  unlink(destPath).catch(() => null);

  return createdFileEntry;
}

async function uploadAndCreateFileEntry(
  fileURI: string,
  fileName: string,
  fileExtension: string,
  currentFolderId: string,
  progressCallback: ProgressCallback,
) {
  const { bucket, bridgeUser, mnemonic, userId } = await deviceStorage.getUser();
  const fileId = await uploadFile(
    fileURI,
    bucket,
    process.env.REACT_NATIVE_BRIDGE_URL!,
    {
      encryptionKey: mnemonic,
      user: bridgeUser,
      password: userId,
    },
    {
      progress: progressCallback,
    },
  );

  const fileStat = await stat(fileURI);

  const folderId = currentFolderId;
  const name = encryptFilename(removeExtension(fileName), folderId);
  const fileSize = fileStat.size;
  const fileEntry: FileEntry = {
    fileId,
    file_id: fileId,
    type: fileExtension,
    bucket,
    size: fileSize.toString(),
    folder_id: folderId,
    name,
    encrypt_version: '03-aes',
  };

  return createFileEntry(fileEntry);
}

function UploadModal(): JSX.Element {
  const dispatch = useAppDispatch();
  const { folderContent } = useAppSelector((state) => state.files);
  const { user } = useAppSelector((state) => state.auth);
  const currentFolder = folderContent?.currentFolder || user?.root_folder_id;
  const { showUploadModal } = useAppSelector((state) => state.layout);

  function upload(res: UploadingFile, fileType: 'document' | 'image') {
    function progressCallback(progress: number) {
      dispatch(filesActions.uploadFileSetProgress({ progress, id: res.id }));
    }

    if (Platform.OS === 'ios') {
      return uploadIOS(res, fileType, progressCallback);
    }

    if (Platform.OS === 'android') {
      return uploadAndroid(res, fileType, progressCallback);
    }

    throw new Error('Unsuported platform');
  }

  async function trackUploadStart() {
    const { uuid, email } = await deviceStorage.getUser();
    const uploadStartedTrack = { userId: uuid, email, device: DevicePlatform.Mobile };

    analytics.track('file-upload-start', uploadStartedTrack).catch(() => null);
  }

  async function trackUploadSuccess() {
    const { email, uuid } = await deviceStorage.getUser();
    const uploadFinishedTrack = { userId: uuid, email, device: DevicePlatform.Mobile };

    analytics.track('file-upload-finished', uploadFinishedTrack).catch(() => null);
  }

  async function trackUploadError(err: Error) {
    const { email, uuid } = await deviceStorage.getUser();
    const uploadErrorTrack = { userId: uuid, email, device: DevicePlatform.Mobile, error: err.message };

    analytics.track('file-upload-error', uploadErrorTrack).catch(() => null);
  }

  function uploadSuccess(file: { id: string }) {
    trackUploadSuccess();

    dispatch(filesActions.removeUploadingFile(file.id));
    dispatch(filesActions.updateUploadingFile(file.id));
    dispatch(filesActions.setUri(undefined));
  }

  function processFilesFromPicker(documents: any[]): Promise<void> {
    documents.forEach((doc) => (doc.uri = doc.fileCopyUri));
    dispatch(layoutActions.setShowUploadFileModal(false));

    return uploadDocuments(documents);
  }

  function toUploadingFile(
    filesAtSameLevel: { name: string; type: string }[],
    file: DocumentPickerResponse,
  ): UploadingFile {
    const nameSplittedByDots = file.name.split('.');

    return {
      uri: file.uri,
      name: renameIfAlreadyExists(filesAtSameLevel, removeExtension(file.name), getFileExtension(file.name) || '')[2],
      type: nameSplittedByDots[nameSplittedByDots.length - 1] || '',
      currentFolder,
      createdAt: new Date().toString(),
      updatedAt: new Date().toString(),
      id: uniqueId(),
      path: '',
      size: file.size,
      progress: 0,
    };
  }

  async function uploadDocuments(documents: DocumentPickerResponse[]) {
    const filesToUpload: DocumentPickerResponse[] = [];
    const filesExcluded: DocumentPickerResponse[] = [];

    for (const file of documents) {
      if (file.size <= UPLOAD_FILES_LIMIT) {
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

    const formattedFiles: UploadingFile[] = [];

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
            getFileExtension(fileToUpload.name) || '',
          )[2],
          type: getFileExtension(fileToUpload.uri) || '',
          currentFolder,
          createdAt: new Date().toString(),
          updatedAt: new Date().toString(),
          id: uniqueId(),
          path: '',
          size: fileToUpload.size,
          progress: 0,
        };
      }

      trackUploadStart();
      dispatch(filesActions.uploadFileStart(file.name));
      dispatch(filesActions.addUploadingFile({ ...file, isLoading: true }));

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
          dispatch(filesActions.uploadFileFailed({ errorMessage: err.message, id: file.id }));
          notify({
            text: 'Cannot upload file: ' + err.message,
            type: 'error',
          });
        })
        .finally(() => {
          dispatch(filesActions.uploadFileFinished());
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
          dispatch(layoutActions.setShowUploadFileModal(false));
          return uploadDocuments(documents);
        })
        .then(() => {
          if (currentFolder) {
            dispatch(filesThunks.getFolderContentThunk({ folderId: currentFolder }));
          }
        })
        .catch((err) => {
          if (err.message === 'User canceled document picker') {
            return;
          }
          Alert.alert('File upload error', err.message);
        })
        .finally(() => {
          dispatch(layoutActions.setShowUploadFileModal(false));
        });
    } else {
      DocumentPicker.pickMultiple({
        type: [DocumentPicker.types.allFiles],
        copyTo: 'cachesDirectory',
      })
        .then(processFilesFromPicker)
        .then(() => {
          if (currentFolder) {
            dispatch(filesThunks.getFolderContentThunk({ folderId: currentFolder }));
          }
        })
        .catch((err) => {
          if (err.message === 'User canceled document picker') {
            return;
          }
          Alert.alert('File upload error', err.message);
        })
        .finally(() => {
          dispatch(layoutActions.setShowUploadFileModal(false));
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

            dispatch(layoutActions.setShowUploadFileModal(false));
            uploadDocuments(documents)
              .then(() => {
                if (currentFolder) {
                  dispatch(filesThunks.getFolderContentThunk({ folderId: currentFolder }));
                }
              })
              .catch((err) => {
                if (err.message === 'User canceled document picker') {
                  return;
                }
                Alert.alert('File upload error', err.message);
              })
              .finally(() => {
                dispatch(layoutActions.setShowUploadFileModal(false));
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
          if (currentFolder) {
            dispatch(filesThunks.getFolderContentThunk({ folderId: currentFolder }));
          }
        })
        .catch((err) => {
          if (err.message === 'User canceled document picker') {
            return;
          }
          Alert.alert('File upload error', err.message);
        })
        .finally(() => {
          dispatch(layoutActions.setShowUploadFileModal(false));
        });
    }
  }

  async function handleTakePhotoAndUpload() {
    const { status } = await requestCameraPermissionsAsync();

    if (status === 'granted') {
      let error = null;

      const result: any = await launchCameraAsync().catch((err) => {
        error = err;
      });

      if (error) {
        return Alert.alert((error as Error).message);
      }

      if (!result) {
        return;
      }

      if (!result.cancelled) {
        const file = result;

        // Set name for pics/photos
        if (!file.name) {
          file.name = result.uri.split('/').pop();
        }
        file.progress = 0;
        file.currentFolder = currentFolder;
        file.createdAt = new Date().toString();
        file.updatedAt = new Date().toString();
        file.id = uniqueId();

        file.name = removeExtension(file.name);
        file.type = getFileExtension(result.uri);

        trackUploadStart();
        dispatch(filesActions.uploadFileStart(file.name));
        dispatch(filesActions.addUploadingFile(file));

        dispatch(layoutActions.setShowUploadFileModal(false));

        upload(file, 'image')
          .then(() => {
            uploadSuccess(file);
          })
          .catch((err) => {
            trackUploadError(err);
            dispatch(filesActions.uploadFileFailed(file.id));
            Alert.alert('Error', 'Cannot upload file due to: ' + err.message);
          })
          .finally(() => {
            dispatch(filesActions.uploadFileFinished());
            if (currentFolder) {
              dispatch(filesThunks.getFolderContentThunk({ folderId: currentFolder }));
            }
          });
      }
    }
  }

  return (
    <Modal
      swipeToClose={false}
      position={'bottom'}
      style={tailwind('bg-transparent')}
      coverScreen={Platform.OS === 'android'}
      isOpen={showUploadModal}
      entry={'bottom'}
      onClosed={() => {
        dispatch(layoutActions.setShowUploadFileModal(false));
      }}
      backButtonClose={true}
      backdropPressToClose={true}
      animationDuration={250}
    >
      <View style={tailwind('h-full')}>
        <TouchableWithoutFeedback
          style={tailwind('flex-grow')}
          onPress={() => {
            dispatch(layoutActions.setShowUploadFileModal(false));
          }}
        >
          <View style={tailwind('flex-grow')} />
        </TouchableWithoutFeedback>

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
                <View style={tailwind('h-12 w-12 items-center justify-center')}>
                  <Unicons.UilFileUpload color={getColor('neutral-500')} size={20} />
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
                <View style={tailwind('h-12 w-12 items-center justify-center')}>
                  <Unicons.UilImages color={getColor('neutral-500')} size={20} />
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
                <Text style={tailwind('text-lg text-neutral-500')}>
                  {strings.components.buttons.takeAPhotoAnUpload}
                </Text>
                <View style={tailwind('h-12 w-12 items-center justify-center')}>
                  <Unicons.UilCameraPlus color={getColor('neutral-500')} size={20} />
                </View>
              </View>
            </TouchableHighlight>

            <View style={tailwind('flex-grow h-px bg-neutral-20')}></View>

            <TouchableHighlight
              style={tailwind('flex-grow')}
              underlayColor={getColor('neutral-80')}
              onPress={() => {
                dispatch(layoutActions.setShowCreateFolderModal(true));
                dispatch(layoutActions.setShowUploadFileModal(false));
              }}
            >
              <View style={tailwind('flex-row flex-grow bg-white h-12 pl-4 items-center justify-between')}>
                <Text style={tailwind('text-lg text-neutral-500')}>{strings.components.buttons.newFolder}</Text>
                <View style={tailwind('h-12 w-12 items-center justify-center')}>
                  <Unicons.UilFolderPlus color={getColor('neutral-500')} size={20} />
                </View>
              </View>
            </TouchableHighlight>
          </View>

          <View style={tailwind('mt-4 rounded-xl overflow-hidden')}>
            <TouchableHighlight
              style={tailwind('flex-grow')}
              underlayColor={getColor('neutral-80')}
              onPress={() => {
                dispatch(layoutActions.setShowUploadFileModal(false));
              }}
            >
              <View style={tailwind('flex-row flex-grow bg-white h-12 items-center justify-center')}>
                <Text style={[tailwind('text-lg text-neutral-500'), globalStyle.fontWeight.medium]}>
                  {strings.generic.cancel}
                </Text>
              </View>
            </TouchableHighlight>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default UploadModal;
