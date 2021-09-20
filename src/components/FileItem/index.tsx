import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { connect } from 'react-redux';
import { fileActions, layoutActions } from '../../redux/actions';
import { deviceStorage, FolderIcon, getFileTypeIcon } from '../../helpers';
import FileViewer from 'react-native-file-viewer'
import analytics from '../../helpers/lytics';
import { IFile, IFolder, IUploadingFile } from '../FileList';
import { Reducers } from '../../redux/reducers/reducers';
import * as FileSystem from 'expo-file-system'
import * as Unicons from '@iconscout/react-native-unicons';
import { downloadFile } from '../../services/download';
import { createEmptyFile, exists, FileManager, getDocumentsDir } from '../../lib/fs';
import { tailwind } from '../../helpers/designSystem';

interface FileItemProps extends Reducers {
  isFolder: boolean
  item: IFile & IFolder & IUploadingFile
  isLoading?: boolean
  nameEncrypted?: boolean
  selectable?: boolean
  subtitle: JSX.Element
}

async function handleLongPress(props: FileItemProps, isSelected: boolean) {
  // if (isSelected) {
  //   props.dispatch(fileActions.deselectFile(props.item))
  // } else {
  //   props.dispatch(fileActions.selectFile(props.item))
  // }
}

function FileItem(props: FileItemProps) {
  const isSelectionMode = props.filesState.selectedItems.length > 0
  const isSelected = props.filesState.selectedItems.filter((x: any) => x.id === props.item.id).length > 0

  const [progress, setProgress] = useState(0)
  const progressWidth = 30 * progress;

  const [uploadProgress, setUploadProgress] = useState(0)
  const uploadProgressWidth = 30 * uploadProgress

  const [isLoading, setIsLoading] = useState(props.isLoading ? true : false)

  const extendStyles = StyleSheet.create({
    containerBackground: { backgroundColor: isSelected ? '#f2f5ff' : '#fff' },
    text: { color: '#000000' }
  });

  async function handleItemPressed() {
    setIsLoading(true);

    if (props.isFolder) {
      handleFolderClick();
    } else {
      await handleFileClick();
    }

    setIsLoading(false);
  }

  function handleFolderClick() {
    trackFolderOpened();
    props.dispatch(fileActions.getFolderContent(props.item.id.toString()));
    props.dispatch(fileActions.addDepthAbsolutePath([props.item.name]));
  }

  async function handleFileClick(): Promise<void> {
    const isRecentlyUploaded = props.item.isUploaded && props.item.uri;

    if (isLoading) {
      return;
    }

    if (isRecentlyUploaded) {
      showFileViewer(props.item.uri);
      return;
    }

    const filename = props.item.name.substring(0, props.item.type.length + 1);
    const extension = props.item.type;

    // TODO: Donde tiene que ir en caso de las fotos
    const destinationDir = await getDocumentsDir();
    let destinationPath = destinationDir + '/' + filename + (extension ? '.' + extension : '');

    trackDownloadStart();
    props.dispatch(fileActions.downloadSelectedFileStart());

    const fileAlreadyExists = await exists(destinationPath);

    if (fileAlreadyExists) {
      destinationPath = destinationDir + '/' + filename + '-' + Date.now().toString() + (extension ? '.' + extension : '');
    }

    await createEmptyFile(destinationPath);

    const fileManager = new FileManager(destinationPath);

    return downloadFile(props.item.fileId, {
      fileManager,
      progressCallback: (progress) => { setProgress(progress); }
    }).then(async () => {
      trackDownloadSuccess();

      if (Platform.OS === 'android') {
        const { uri } = await FileSystem.getInfoAsync('file://' + destinationPath);

        return showFileViewer(uri);
      }

      return showFileViewer(destinationPath);
    }).catch((err) => {
      trackDownloadError(err);

      Alert.alert('Error downloading file', err.message);
    }).finally(() => {
      props.dispatch(fileActions.downloadSelectedFileStop());
      setProgress(0);
    });
  }

  function showFileViewer(fileUri: string) {
    return FileSystem.getInfoAsync(fileUri).then((fileInfo) => {
      if (!fileInfo.exists) {
        throw new Error('File not found');
      }

      return FileViewer.open(fileInfo.uri);
    });
  }

  async function track(event: string, payload: any) {
    const { uuid, email } = await deviceStorage.getUser();

    return analytics.track(event, { ...payload, email, userId: uuid }).catch(() => null);
  }

  function trackDownloadStart(): Promise<void> {
    return track('file-download-start', {
      // eslint-disable-next-line camelcase
      file_id: props.item.id,
      // eslint-disable-next-line camelcase
      file_size: props.item.size,
      // eslint-disable-next-line camelcase
      file_type: props.item.type,
      // eslint-disable-next-line camelcase
      folder_id: props.item.folderId,
      platform: 'mobile'
    });
  }

  function trackDownloadSuccess(): Promise<void> {
    return track('file-download-finished', {
      // eslint-disable-next-line camelcase
      file_id: props.item.id,
      // eslint-disable-next-line camelcase
      file_size: props.item.size,
      // eslint-disable-next-line camelcase
      file_type: props.item.type,
      // eslint-disable-next-line camelcase
      folder_id: props.item.folderId,
      platform: 'mobile'
    });
  }

  function trackDownloadError(err: Error): Promise<void> {
    return track('file-download-error', {
      // eslint-disable-next-line camelcase
      file_id: props.item.id,
      // eslint-disable-next-line camelcase
      file_size: props.item.size,
      // eslint-disable-next-line camelcase
      file_type: props.item.type,
      // eslint-disable-next-line camelcase
      folder_id: props.item.folderId,
      platform: 'mobile',
      error: err.message
    });
  }

  function trackFolderOpened(): Promise<void> {
    return track('folder-opened', {
      // eslint-disable-next-line camelcase
      folder_id: props.item.id
    });
  }

  useEffect(() => {
    setUploadProgress(props.item.progress)
  }, [props.item.progress])

  const item = props.item
  const IconFile = getFileTypeIcon(props.item.type);

  return (
    <View>
      <View style={[styles.container, extendStyles.containerBackground]}>
        <View style={styles.mainContainer}>
          <View style={styles.fileDetails}>
            <TouchableOpacity
              style={styles.touchableItemArea}
              onLongPress={() => { handleLongPress(props, isSelected) }}
              onPress={async () => { await handleItemPressed(); }}>
              <View style={styles.itemIcon}>
                {
                  props.isFolder ?
                    <>
                      <FolderIcon width={30} height={30} />
                    </>
                    :
                    <>
                      <IconFile width={30} height={30} />
                    </>
                }

                <View style={tailwind('mt-3')}>
                  <View style={styles.progressIndicatorContainer}>
                    {
                      progressWidth ?
                        <View
                          style={[styles.progressIndicator, { width: progressWidth }]}><Text>Progress</Text></View>
                        : <></>
                    }

                    {
                      props.isLoading ?
                        <View
                          style={[styles.progressIndicator, { width: uploadProgressWidth }]} />
                        : <></>
                    }
                  </View>
                </View>

              </View>

              <View style={styles.nameAndTime}>
                <Text
                  style={[styles.fileName, extendStyles.text]}
                  numberOfLines={1} // once local upload implemented, remove conditional
                >{props.isFolder ? props.item.name : props.item.name.split('.').shift()}</Text>

                {props.subtitle ? props.subtitle : <Text style={styles.updatedAt}>Updated {new Date(props.item.updatedAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}</Text>}
              </View>
            </TouchableOpacity>
          </View>
          {
            !isLoading ?
              <View style={styles.buttonDetails}>
                <TouchableOpacity
                  style={isSelectionMode ? styles.dNone : styles.dFlex}
                  onPress={() => {
                    props.dispatch(fileActions.focusItem(props.item));
                    props.dispatch(layoutActions.openItemModal())
                  }
                  }>
                  <Unicons.UilEllipsisH size={24} color={'#7A869A'} />
                </TouchableOpacity>
              </View>
              :
              <View style={tailwind('p-10')}>
                <ActivityIndicator color='#aaf' size='large' />
              </View>
          }
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  buttonDetails: {
    alignItems: 'center',
    borderRadius: 30,
    height: 55,
    justifyContent: 'center',
    width: 51
  },
  container: {
    borderColor: '#e6e6e6',
    flexDirection: 'column'
  },
  dFlex: {
    display: 'flex'
  },
  dNone: {
    display: 'none'
  },
  fileDetails: {
    flexGrow: 1
  },
  fileName: {
    color: '#172B4D',
    fontFamily: 'NeueEinstellung-Regular',
    fontSize: 16,
    letterSpacing: -0.1
  },
  itemIcon: {
    margin: 20,
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'stretch'
  },
  mainContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 75
  },
  nameAndTime: {
    flexDirection: 'column',
    width: '56%'
  },
  progressIndicator: {
    backgroundColor: '#00f',
    borderRadius: 3,
    height: 3,
    marginBottom: 7,
    opacity: 0.6
  },
  progressIndicatorContainer: {
    height: 3,
    width: 30,
    borderRadius: 3
  },
  touchableItemArea: {
    alignItems: 'center',
    flexDirection: 'row'
  },
  updatedAt: {
    fontFamily: 'NeueEinstellung-Regular',
    fontSize: 14,
    color: '#42526E'
  }
});

const mapStateToProps = (state: any) => ({ ...state });

export default connect<Reducers>(mapStateToProps)(FileItem);