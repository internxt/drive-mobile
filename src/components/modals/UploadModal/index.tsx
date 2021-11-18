import React from 'react'
import { View, Text, Alert, Platform, PermissionsAndroid, TouchableWithoutFeedback, TouchableHighlight } from 'react-native';
import { connect, useSelector } from 'react-redux';
import { uniqueId } from 'lodash';
import Modal from 'react-native-modalbox';
import { launchCameraAsync, requestCameraPermissionsAsync, requestMediaLibraryPermissionsAsync } from 'expo-image-picker';
import DocumentPicker, { DocumentPickerResponse } from 'react-native-document-picker';
import { launchImageLibrary } from 'react-native-image-picker'
import * as Unicons from '@iconscout/react-native-unicons';

import { fileActions, layoutActions } from '../../../store/actions';
import { createFileEntry, FileEntry, getFinalUri, uploadFile, FileMeta } from '../../../services/upload';
import analytics from '../../../helpers/analytics';
import { deviceStorage, encryptFilename } from '../../../helpers';
import { stat, getTemporaryDir, copyFile, unlink, clearTempDir } from '../../../lib/fs';
import { Reducers } from '../../../store/reducers/reducers';
import { renameIfAlreadyExists } from '../../../lib';
import { UPLOAD_FILES_LIMIT } from '../../../lib/constants';
import strings from '../../../../assets/lang/strings';
import { notify } from '../../../helpers/toast';
import { tailwind, getColor } from '../../../helpers/designSystem';
import globalStyle from '../../../styles/global.style';
import RNFS from 'react-native-fs';

interface UploadingFile {
  size: number
  progress: number
  name: string
  type: string
  currentFolder: any
  createdAt: Date
  updatedAt: Date
  id: string
  uri: string
  path: string
  folderId?: number
}

function getFileExtension(uri: string) {
  const regex = /^(.*:\/{0,2})\/?(.*)$/gm;
  const fileUri = uri.replace(regex, '$2');

  return fileUri.split('.').pop();
}

function removeExtension(filename: string) {
  const filenameSplitted = filename.split('.');
  const extension = filenameSplitted.length > 1 ? filenameSplitted.pop() : '';

  if (extension === '') {
    return filename;
  }

  return filename.substring(0, filename.length - (extension.length + 1));
}

function UploadModal(props: Reducers) {
  const { filesState, authenticationState, layoutState } = useSelector<any, Reducers>(state => state);

  const currentFolder = filesState.folderContent?.currentFolder || authenticationState.user.root_folder_id;

  async function uploadIOS(res: FileMeta, fileType: 'document' | 'image') {
    function progressCallback(progress: number) {
      props.dispatch(fileActions.uploadFileSetProgress(progress, res.id));
    }

    // TODO: Refactor this to avoid coupling input object to redux provided object
    const result = { ...res };

    // Set name for pics/photos
    if (!result.name) {
      result.name = result.uri.split('/').pop(); // ??
    }

    const regex = /^(.*:\/{0,2})\/?(.*)$/gm
    const fileUri = result.uri.replace(regex, '$2')
    const extension = fileUri.split('.').pop();
    const finalUri = getFinalUri(fileUri, fileType);

    result.uri = finalUri;
    result.type = fileType;
    result.path = filesState.absolutePath + result.name;

    const fileStat = await stat(finalUri);

    if (Platform.OS === 'android' && fileType === 'image') {
      result.uri = 'file:///' + result.uri;
    }

    const fileId = await uploadFile(result, progressCallback);

    const folderId = result.currentFolder.toString();
    const name = encryptFilename(removeExtension(result.name), folderId);
    const fileSize = fileStat.size;
    const type = extension;
    const { bucket } = await deviceStorage.getUser();
    const fileEntry: FileEntry = { fileId, file_id: fileId, type, bucket, size: fileSize.toString(), folder_id: folderId, name, encrypt_version: '03-aes' };

    return createFileEntry(fileEntry);
  }

  async function uploadAndroid(res: FileMeta, fileType: 'document' | 'image') {
    function progressCallback(progress: number) {
      props.dispatch(fileActions.uploadFileSetProgress(progress, res.id));
    }

    // TODO: Refactor this to avoid coupling input object to redux provided object
    const result = { ...res };

    // Set name for pics/photos
    if (!result.name) {
      result.name = result.uri.split('/').pop(); // ??
    }
    const destPath = `${getTemporaryDir()}/${result.name}`;

    await copyFile(result.uri, destPath)

    const extension = result.name.split('.').pop();
    const finalUri = destPath // result.uri //getFinalUri(fileUri, fileType);

    if (Platform.OS === 'android' && fileType === 'document') {

      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE, {
        title: 'Files Permission',
        message: 'Internxt needs access to your files in order to upload documents',
        buttonNegative: 'Cancel',
        buttonPositive: 'Grant'
      });

      if (!granted) {
        Alert.alert('Can not upload files');
        return;
      }
    }

    result.uri = finalUri;
    result.type = fileType;
    result.path = filesState.absolutePath + result.name;

    result.uri = 'file:///' + result.uri;

    const fileId = await uploadFile(result, progressCallback);

    const folderId = result.currentFolder.toString();
    const name = encryptFilename(removeExtension(result.name), folderId);
    const fileSize = result.size;
    const type = extension;
    const { bucket } = await deviceStorage.getUser();
    const fileEntry: FileEntry = { fileId, file_id: fileId, type, bucket, size: fileSize, folder_id: folderId, name, encrypt_version: '03-aes' };

    unlink(destPath).catch(() => { });
    return createFileEntry(fileEntry);
  }

  async function trackUploadStart() {
    const { uuid, email } = await deviceStorage.getUser();
    const uploadStartedTrack = { userId: uuid, email, device: 'mobile' };

    analytics.track('file-upload-start', uploadStartedTrack).catch(() => null);
  }

  async function trackUploadSuccess() {
    const { email, uuid } = await deviceStorage.getUser();
    const uploadFinishedTrack = { userId: uuid, email, device: 'mobile' };

    analytics.track('file-upload-finished', uploadFinishedTrack).catch(() => null);
  }

  async function trackUploadError(err: Error) {
    const { email, uuid } = await deviceStorage.getUser();
    const uploadErrorTrack = { userId: uuid, email, device: 'mobile', error: err.message };

    analytics.track('file-upload-error', uploadErrorTrack).catch(() => null);
  }

  function uploadSuccess(file: { id: string }) {
    trackUploadSuccess();

    props.dispatch(fileActions.removeUploadingFile(file.id));
    props.dispatch(fileActions.updateUploadingFile(file.id));
    props.dispatch(fileActions.uploadFileSetUri(undefined));
  }

  function processFilesFromPicker(documents): Promise<void> {
    documents.forEach(doc => doc.uri = doc.fileCopyUri);
    props.dispatch(layoutActions.closeUploadFileModal());
    return uploadDocuments(documents);
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

    const filesAtSameLevel = filesState.folderContent.files.map(file => {
      return { name: removeExtension(file.name), type: file.type };
    });

    const formattedFiles: UploadingFile[] = [];

    for (const fileToUpload of filesToUpload) {
      const file: UploadingFile = {
        uri: fileToUpload.uri,
        name: renameIfAlreadyExists(filesAtSameLevel, removeExtension(fileToUpload.name), getFileExtension(fileToUpload.name))[2] + '.' + getFileExtension(fileToUpload.name),
        progress: 0,
        type: getFileExtension(fileToUpload.uri),
        currentFolder,
        createdAt: new Date(),
        updatedAt: new Date(),
        id: uniqueId(),
        path: '',
        size: fileToUpload.size
      }

      trackUploadStart();
      props.dispatch(fileActions.uploadFileStart());
      props.dispatch(fileActions.addUploadingFile(file));

      formattedFiles.push(file);
      filesAtSameLevel.push({ name: removeExtension(fileToUpload.name), type: fileToUpload.type });
    }

    const upload = Platform.OS === 'ios' ? uploadIOS : uploadAndroid;

    if (Platform.OS === 'android') {
      await clearTempDir();
    }
    for (const file of formattedFiles) {
      await upload(file, 'document').then(() => {
        uploadSuccess(file);
      }).catch((err) => {
        trackUploadError(err);
        props.dispatch(fileActions.uploadFileFailed(parseInt(file.id, 10)));
        notify({
          text: 'Cannot upload file: ' + err.message,
          type: 'error'
        });
      }).finally(() => {
        props.dispatch(fileActions.uploadFileFinished(file.name));
      });
    }
  }

  function handleUploadFiles() {
    if (Platform.OS === 'ios') {
      DocumentPicker.pickMultiple({
        type: [DocumentPicker.types.allFiles],
        copyTo: 'cachesDirectory'
      }).then((documents) => {
        documents.forEach(doc => doc.uri = doc.fileCopyUri);
        props.dispatch(layoutActions.closeUploadFileModal());
        return uploadDocuments(documents);
      }).then(() => {
        props.dispatch(fileActions.getFolderContent(currentFolder));
      }).catch((err) => {
        if (err.message === 'User canceled document picker') {
          return;
        }
        Alert.alert('File upload error', err.message);
      }).finally(() => {
        props.dispatch(layoutActions.closeUploadFileModal());
      })
    } else {
      DocumentPicker.pickMultiple({
        type: [DocumentPicker.types.allFiles],
        copyTo: 'cachesDirectory'
      }).then(processFilesFromPicker).then(() => {
        props.dispatch(fileActions.getFolderContent(currentFolder));
      }).catch((err) => {
        if (err.message === 'User canceled document picker') {
          return;
        }
        Alert.alert('File upload error', err.message);
      }).finally(() => {
        props.dispatch(layoutActions.closeUploadFileModal());
      })
      // getDocumentAsync({ copyToCacheDirectory: true }).then((result) => {
      //   if (result.type !== 'cancel') {
      //     const documents: DocumentPickerResponse[] = [{
      //       fileCopyUri: result.uri,
      //       name: result.name,
      //       size: result.size,
      //       type: '',
      //       uri: result.uri
      //     }]

      //     props.dispatch(layoutActions.closeUploadFileModal());
      //     return uploadDocuments(documents);
      //   }
      // }).then(() => {
      //   props.dispatch(fileActions.getFolderContent(currentFolder));
      // }).catch((err) => {
      //   if (err.message === 'User canceled document picker') {
      //     return;
      //   }
      //   Alert.alert('File upload error', err.message);
      // }).finally(() => {
      //   props.dispatch(layoutActions.closeUploadFileModal());
      // });
    }
  }

  async function handleUploadFromCameraRoll() {
    if (Platform.OS === 'ios') {
      const { status } = await requestMediaLibraryPermissionsAsync(false)

      if (status === 'granted') {
        launchImageLibrary({ mediaType: 'mixed', selectionLimit: 0 }, async (response) => {
          if (response.errorMessage) {
            return Alert.alert(response.errorMessage)
          }
          if (response.assets) {
            const documents: DocumentPickerResponse[] = [];

            for (const asset of response.assets) {
              const stat = await RNFS.stat(asset.uri);

              documents.push({
                fileCopyUri: asset.uri,
                name: asset.fileName || asset.uri.substring(asset.uri.lastIndexOf('/')+1),
                size: asset.fileSize || typeof stat.size === 'string' ? parseInt(stat.size) : stat.size,
                type: asset.type,
                uri: asset.uri
              })
            }

            props.dispatch(layoutActions.closeUploadFileModal());
            uploadDocuments(documents).then(() => {
              props.dispatch(fileActions.getFolderContent(currentFolder));
            }).catch((err) => {
              if (err.message === 'User canceled document picker') {
                return;
              }
              Alert.alert('File upload error', err.message);
            }).finally(() => {
              props.dispatch(layoutActions.closeUploadFileModal());
            })
          }
        })
      }
    }
    else {
      DocumentPicker.pickMultiple({
        type: [DocumentPicker.types.images],
        copyTo: 'cachesDirectory'
      }).then(processFilesFromPicker).then(() => {
        props.dispatch(fileActions.getFolderContent(currentFolder));
      }).catch((err) => {
        if (err.message === 'User canceled document picker') {
          return;
        }
        Alert.alert('File upload error', err.message);
      }).finally(() => {
        props.dispatch(layoutActions.closeUploadFileModal());
      })
    }
  }

  async function handleTakePhotoAndUpload() {
    const { status } = await requestCameraPermissionsAsync();

    if (status === 'granted') {
      let error: Error | null = null;

      const result: any = await launchCameraAsync().catch(err => {
        error = err;
      })

      if (error) {
        return Alert.alert(error?.message);
      }

      if (!result) {
        return;
      }

      if (!result.cancelled) {
        const file = result

        // Set name for pics/photos
        if (!file.name) {
          file.name = result.uri.split('/').pop()
        }
        file.progress = 0
        file.currentFolder = currentFolder
        file.createdAt = new Date();
        file.updatedAt = new Date();
        file.id = uniqueId()

        trackUploadStart();
        props.dispatch(fileActions.uploadFileStart());
        props.dispatch(fileActions.addUploadingFile(file));

        props.dispatch(layoutActions.closeUploadFileModal());

        uploadIOS(file, 'image').then(() => {
          uploadSuccess(file);
        }).catch(err => {
          trackUploadError(err);
          props.dispatch(fileActions.uploadFileFailed(file.id));
          Alert.alert('Error', 'Cannot upload file due to: ' + err.message);
        }).finally(() => {
          props.dispatch(fileActions.uploadFileFinished(file.name));
          props.dispatch(fileActions.getFolderContent(currentFolder));
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
      isOpen={layoutState.showUploadModal}
      entry={'bottom'}
      onClosed={() => {
        props.dispatch(layoutActions.closeUploadFileModal())
      }}
      backButtonClose={true}
      backdropPressToClose={true}
      animationDuration={250}
    >

      <View style={tailwind('h-full')}>

        <TouchableWithoutFeedback
          style={tailwind('flex-grow')}
          onPress={() => {
            props.dispatch(layoutActions.closeUploadFileModal())
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
                handleUploadFiles()
              }}
            >
              <View style={tailwind('flex-row flex-grow bg-white h-12 pl-4 items-center justify-between')}>
                <Text style={tailwind('text-lg text-neutral-500')}>Upload files</Text>
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
                handleUploadFromCameraRoll()
              }}
            >
              <View style={tailwind('flex-row flex-grow bg-white h-12 pl-4 items-center justify-between')}>
                <Text style={tailwind('text-lg text-neutral-500')}>Upload from camera roll</Text>
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
                handleTakePhotoAndUpload()
              }}
            >
              <View style={tailwind('flex-row flex-grow bg-white h-12 pl-4 items-center justify-between')}>
                <Text style={tailwind('text-lg text-neutral-500')}>Take photo and upload</Text>
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
                props.dispatch(layoutActions.openCreateFolderModal());
                props.dispatch(layoutActions.closeUploadFileModal());
              }}
            >
              <View style={tailwind('flex-row flex-grow bg-white h-12 pl-4 items-center justify-between')}>
                <Text style={tailwind('text-lg text-neutral-500')}>New folder</Text>
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
                props.dispatch(layoutActions.closeUploadFileModal())
              }}
            >
              <View style={tailwind('flex-row flex-grow bg-white h-12 pl-4 items-center justify-center')}>
                <Text style={[tailwind('text-lg text-neutral-500'), globalStyle.fontWeight.medium]}>{strings.generic.cancel}</Text>
              </View>
            </TouchableHighlight>

          </View>

        </View>

      </View>

    </Modal>
  )
}

const mapStateToProps = (state: any) => {
  return {
    user: state.authenticationState.user,
    layoutState: state.layoutState
  };
};

export default connect(mapStateToProps)(UploadModal);