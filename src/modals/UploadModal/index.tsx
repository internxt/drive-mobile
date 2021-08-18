import React from 'react'
import { View, StyleSheet, Text, Alert, Platform, PermissionsAndroid } from 'react-native';
import { connect, useSelector } from 'react-redux';
import { uniqueId } from 'lodash';
import Modal from 'react-native-modalbox';
import { launchCameraAsync, requestCameraPermissionsAsync, requestMediaLibraryPermissionsAsync } from 'expo-image-picker';
import DocumentPicker, { DocumentPickerResponse } from 'react-native-document-picker';
import { launchImageLibrary } from 'react-native-image-picker'
import { getDocumentAsync } from 'expo-document-picker'

import { fileActions, layoutActions } from '../../redux/actions';
import SettingsItem from '../SettingsModal/SettingsItem';
import { createFileEntry, FileEntry, getFinalUri, uploadFile, FileMeta } from '../../services/upload';
import Separator from '../../components/Separator';
import * as Unicons from '@iconscout/react-native-unicons'
import analytics from '../../helpers/lytics';
import { deviceStorage, encryptFilename } from '../../helpers';
import { stat } from '../../lib/fs';
import { Reducers } from '../../redux/reducers/reducers';
import { renameIfAlreadyExists } from '../../lib';
import { UPLOAD_FILES_LIMIT } from '../../lib/constants';
import strings from '../../../assets/lang/strings';

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

    // const regex = /^(.*:\/{0,2})\/?(.*)$/gm
    // const fileUri = result.uri.replace(regex, '$2')
    const extension = result.name.split('.').pop();
    const finalUri = result.uri //getFinalUri(fileUri, fileType);

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
      // finalUri = 'content://' + finalUri;
    }

    result.uri = finalUri;
    result.type = fileType;
    result.path = filesState.absolutePath + result.name;

    if (Platform.OS === 'android' && fileType === 'image') {
      result.uri = 'file:///' + result.uri;
    }

    const fileId = await uploadFile(result, progressCallback);

    const folderId = result.currentFolder.toString();
    const name = encryptFilename(removeExtension(result.name), folderId);
    const fileSize = result.size;
    const type = extension;
    const { bucket } = await deviceStorage.getUser();
    const fileEntry: FileEntry = { fileId, file_id: fileId, type, bucket, size: fileSize, folder_id: folderId, name, encrypt_version: '03-aes' };

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
      Alert.alert(
        `${filesExcluded.length} files will not be uploaded. Max upload size per file is 1GB`
      );
    }

    const filesAtSameLevel = filesState.folderContent.files.map(file => {
      return { name: removeExtension(file.name), type: file.type };
    });

    const formattedFiles: UploadingFile[] = [];

    for (const fileToUpload of filesToUpload) {
      const file: UploadingFile = {
        uri: fileToUpload.uri,
        name: renameIfAlreadyExists(filesAtSameLevel, removeExtension(fileToUpload.name), getFileExtension(fileToUpload.uri))[2] + '.' + getFileExtension(fileToUpload.uri),
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

    for (const file of formattedFiles) {
      await upload(file, 'document').then(() => {
        uploadSuccess(file);
      }).catch((err) => {
        trackUploadError(err);
        props.dispatch(fileActions.uploadFileFailed(file.id));
        Alert.alert('Error', 'Cannot upload file: ' + err.message);
      }).finally(() => {
        props.dispatch(fileActions.uploadFileFinished(file.name));
      });
    }
  }

  return (
    <Modal
      isOpen={layoutState.showUploadModal}
      position={'bottom'}
      entry={'bottom'}
      coverScreen={true}
      swipeArea={50}
      style={styles.modalSettings}
      onClosed={() => {
        props.dispatch(layoutActions.closeUploadFileModal())
      }}
      backButtonClose={true}
      animationDuration={200}>

      <View style={styles.drawerKnob}></View>

      <View style={styles.alignCenter}>
        <Text style={styles.modalTitle}>{strings.generic.upload}</Text>
      </View>
      <Separator />
      <SettingsItem
        text={'Upload file'}
        icon={Unicons.UilUploadAlt}
        onPress={() => {
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
            getDocumentAsync({ copyToCacheDirectory: true }).then((result) => {
              if (result.type !== 'cancel') {
                const documents: DocumentPickerResponse[] = [{
                  fileCopyUri: result.uri,
                  name: result.name,
                  size: result.size,
                  type: '',
                  uri: result.uri
                }]

                props.dispatch(layoutActions.closeUploadFileModal());
                return uploadDocuments(documents);
              }
            }).then(() => {
              props.dispatch(fileActions.getFolderContent(currentFolder));
            }).catch((err) => {
              if (err.message === 'User canceled document picker') {
                return;
              }
              Alert.alert('File upload error', err.message);
            }).finally(() => {
              props.dispatch(layoutActions.closeUploadFileModal());
            });
          }
        }}
      />

      <SettingsItem
        text={'Take photo & upload'}
        icon={Unicons.UilCameraPlus}
        onPress={async () => {
          const { status } = await requestCameraPermissionsAsync();

          if (status === 'granted') {
            let error: Error | null = null;

            const result = await launchCameraAsync().catch(err => {
              error = err;
            })

            if (error) {
              return Alert.alert(error?.message);
            }

            if (!result) {
              return;
            }

            if (!result.cancelled) {
              const file: any = result

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
        }}
      />

      <SettingsItem
        text={'Upload media'}
        icon={Unicons.UilImagePlus}
        onPress={async () => {
          const { status } = await requestMediaLibraryPermissionsAsync(false)

          if (status === 'granted') {
            launchImageLibrary({ mediaType: 'mixed', selectionLimit: 0 }, (response) => {
              if (response.errorMessage) {
                return Alert.alert(response.errorMessage)
              }
              if (response.assets) {
                const documents: DocumentPickerResponse[] = response.assets.map((asset) => {
                  const doc: DocumentPickerResponse = {
                    fileCopyUri: asset.uri,
                    name: asset.fileName,
                    size: asset.fileSize,
                    type: asset.type,
                    uri: asset.uri
                  }

                  return doc
                })

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
        }}
      />

      <SettingsItem
        text={'New folder'}
        icon={Unicons.UilFolderUpload}
        onPress={() => {
          props.dispatch(layoutActions.openCreateFolderModal());
          props.dispatch(layoutActions.closeUploadFileModal());
        }}
      />

      <Separator />
      <View style={styles.cancelContainer}>
        <SettingsItem
          text={<Text style={styles.cancelText}>{strings.generic.cancel}</Text>}
          onPress={() => {
            props.dispatch(layoutActions.closeUploadFileModal());
          }}
        />
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalSettings: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: 350
  },
  drawerKnob: {
    alignSelf: 'center',
    backgroundColor: '#0F62FE',
    borderRadius: 4,
    height: 4,
    margin: 12,
    width: 50
  },
  cancelText: {
    color: '#f00',
    textAlign: 'center',
    flexGrow: 1,
    fontFamily: 'NeueEinstellung-Regular',
    fontSize: 19,
    fontWeight: '500'
  },
  modalTitle: {
    color: '#42526E',
    fontFamily: 'NeueEinstellung-Regular',
    fontSize: 16,
    marginTop: 20,
    marginBottom: 10,
    fontWeight: 'bold'
  },
  cancelContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    flexGrow: 1,
    marginBottom: 16
  },
  alignCenter: { alignItems: 'center' }
})

const mapStateToProps = (state: any) => {
  return {
    user: state.authenticationState.user,
    layoutState: state.layoutState
  };
};

export default connect(mapStateToProps)(UploadModal);