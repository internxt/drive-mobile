import React from 'react'
import { View, StyleSheet, Text, Alert, Platform } from 'react-native';
import { connect, useSelector } from 'react-redux';
import { uniqueId } from 'lodash';
import Modal from 'react-native-modalbox';
import { launchCameraAsync, launchImageLibraryAsync, MediaTypeOptions, requestCameraPermissionsAsync, requestMediaLibraryPermissionsAsync } from 'expo-image-picker';
import { DocumentResult, getDocumentAsync } from 'expo-document-picker';
import { showToast } from '../../helpers';

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

function getFileExtension(uri: string) {
  const regex = /^(.*:\/{0,2})\/?(.*)$/gm;
  const fileUri = uri.replace(regex, '$2');

  return fileUri.split('.').pop();
}

function removeExtension(filename: string) {
  const extension = filename.split('.').pop();

  return filename.substring(0, filename.length - (extension.length + 1));
}

function UploadModal(props: Reducers) {
  const { filesState, authenticationState, layoutState } = useSelector<any, Reducers>(state => state);

  const currentFolder = filesState.folderContent?.currentFolder || authenticationState.user.root_folder_id;

  async function upload(res: FileMeta, fileType: 'document' | 'image') {
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
        onPress={async () => {
          const result: DocumentResult = await getDocumentAsync({
            copyToCacheDirectory: true
          })

          if (result.type !== 'cancel') {
            if (result.size > UPLOAD_FILES_LIMIT) {
              props.dispatch(layoutActions.closeUploadFileModal());
              showToast({ type: 'error', text: 'Max supported upload size is 1GB' })
              return;
            }

            const file: any = result
            const filesAtSameLevel = filesState.folderContent.files.map(file => {
              return { name: removeExtension(file.name), type: file.type };
            });

            // TODO: Refactor this shit
            file.name = renameIfAlreadyExists(filesAtSameLevel, removeExtension(file.name), getFileExtension(file.uri))[2] + '.' + getFileExtension(file.uri);
            file.progress = 0
            file.type = getFileExtension(result.uri);
            file.currentFolder = currentFolder;
            file.createdAt = new Date();
            file.updatedAt = new Date();
            file.id = uniqueId();

            trackUploadStart();
            props.dispatch(fileActions.uploadFileStart());
            props.dispatch(fileActions.addUploadingFile(file));

            props.dispatch(layoutActions.closeUploadFileModal());

            upload(file, 'document').then(() => {
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

              upload(file, 'image').then(() => {
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
            const result = await launchImageLibraryAsync({ mediaTypes: MediaTypeOptions.All })

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
              file.id = uniqueId();

              trackUploadStart();
              props.dispatch(fileActions.uploadFileStart());
              props.dispatch(fileActions.addUploadingFile(file));

              props.dispatch(layoutActions.closeUploadFileModal());

              upload(file, 'image').then(() => {
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
          } else {
            Alert.alert('Camera roll permissions needed to perform this action')
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