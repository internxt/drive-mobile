import React, { useState } from 'react';
import { View, Text, Alert, TouchableOpacity, TouchableHighlight, Platform, Animated, Easing } from 'react-native';
import FileViewer from 'react-native-file-viewer';
import * as FileSystem from 'expo-file-system';
import * as Unicons from '@iconscout/react-native-unicons';

import analytics from '../../services/analytics';
import { IFile, IFolder, IUploadingFile } from '../FileList';
import { FolderIcon, getFileTypeIcon } from '../../helpers';
import { downloadFile } from '../../services/download';
import { createEmptyFile, exists, FileManager, getDocumentsDir } from '../../lib/fs';
import { getColor, tailwind } from '../../helpers/designSystem';
import FileSpinner from '../../../assets/images/widgets/file-spinner.svg';
import prettysize from 'prettysize';
import globalStyle from '../../styles/global.style';
import { DevicePlatform } from '../../types';
import { filesActions, filesThunks } from '../../store/slices/files';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { deviceStorage } from '../../services/deviceStorage';
import { layoutActions } from '../../store/slices/layout';

interface FileItemProps {
  isFolder: boolean;
  item: IFile | IFolder | IUploadingFile;
  isLoading?: boolean;
  nameEncrypted?: boolean;
  selectable?: boolean;
  subtitle?: JSX.Element;
  isGrid?: boolean;
  totalColumns: number;
  progress: number;
}

function FileItem(props: FileItemProps): JSX.Element {
  const dispatch = useAppDispatch();
  const { selectedItems } = useAppSelector((state) => state.files);
  const isSelectionMode = selectedItems.length > 0;
  const [progress, setProgress] = useState(-1);
  const [isLoading, setIsLoading] = useState(!!props.isLoading);
  const spinValue = new Animated.Value(1);

  Animated.loop(
    Animated.timing(spinValue, {
      toValue: 0,
      duration: 800,
      easing: Easing.linear,
      useNativeDriver: true,
    }),
  ).start();

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
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
    dispatch(filesThunks.getFolderContentThunk({ folderId: props.item.id as number }));
    dispatch(filesActions.addDepthAbsolutePath([props.item.name]));
  }

  async function handleFileClick(): Promise<void> {
    const isRecentlyUploaded = props.item.isUploaded && props.item.uri;

    if (isLoading || !props.item.fileId) {
      return;
    }

    if (isRecentlyUploaded) {
      showFileViewer(props.item.uri as string);
      return;
    }

    const filename = props.item.name.substring(0, props.item.type.length + 1);
    const extension = props.item.type;
    const destinationDir = await getDocumentsDir();
    let destinationPath = destinationDir + '/' + filename + (extension ? '.' + extension : '');

    trackDownloadStart();
    setProgress(0);
    dispatch(filesActions.downloadSelectedFileStart());

    const fileAlreadyExists = await exists(destinationPath);

    if (fileAlreadyExists) {
      destinationPath =
        destinationDir + '/' + filename + '-' + Date.now().toString() + (extension ? '.' + extension : '');
    }

    await createEmptyFile(destinationPath);

    const fileManager = new FileManager(destinationPath);

    return downloadFile(props.item.fileId.toString(), {
      fileManager,
      progressCallback: (progress) => {
        setProgress(progress * 100);
      },
    })
      .then(async () => {
        trackDownloadSuccess();

        if (Platform.OS === 'android') {
          const { uri } = await FileSystem.getInfoAsync('file://' + destinationPath);

          return showFileViewer(uri);
        }

        return showFileViewer(destinationPath);
      })
      .catch((err) => {
        trackDownloadError(err);

        Alert.alert('Error downloading file', err.message);
      })
      .finally(() => {
        dispatch(filesActions.downloadSelectedFileStop());
        setProgress(-1);
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

  function trackDownloadStart() {
    return track('file-download-start', {
      file_id: props.item.id,
      file_size: props.item.size,
      file_type: props.item.type,
      folder_id: props.item.folderId,
      platform: DevicePlatform.Mobile,
    });
  }

  function trackDownloadSuccess() {
    return track('file-download-finished', {
      file_id: props.item.id,
      file_size: props.item.size,
      file_type: props.item.type,
      folder_id: props.item.folderId,
      platform: DevicePlatform.Mobile,
    });
  }

  function trackDownloadError(err: Error) {
    return track('file-download-error', {
      file_id: props.item.id,
      file_size: props.item.size,
      file_type: props.item.type,
      folder_id: props.item.folderId,
      platform: DevicePlatform.Mobile,
      error: err.message,
    });
  }

  function trackFolderOpened() {
    return track('folder-opened', {
      folder_id: props.item.id,
    });
  }

  const IconFile = getFileTypeIcon(props.item.type);

  const showSpinner = props.progress >= 0 || progress >= 0 || props.isLoading || isLoading;

  const iconSize = props.isGrid ? 64 : 40;

  return (
    <TouchableHighlight
      style={props.isGrid && tailwind('px-3 py-1.5 w-1/' + props.totalColumns)}
      underlayColor={getColor('neutral-20')}
      onLongPress={() => {
        if (props.isGrid) {
          dispatch(filesActions.focusItem(props.item));
          dispatch(layoutActions.setShowItemModal(true));
        }
      }}
      onPress={async () => {
        await handleItemPressed();
      }}
    >
      <View style={!props.isGrid && tailwind('flex-row')}>
        <View
          style={[
            tailwind('flex-grow flex-shrink overflow-hidden'),
            tailwind(props.isGrid ? 'flex-col items-center' : 'flex-row'),
          ]}
        >
          <View style={tailwind('my-3 ml-5 mr-4')}>
            {props.isFolder ? (
              <FolderIcon width={iconSize} height={iconSize} />
            ) : (
              <IconFile width={iconSize} height={iconSize} />
            )}

            {showSpinner && (
              <View style={tailwind('absolute -bottom-2 -right-2')}>
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  <FileSpinner />
                </Animated.View>
              </View>
            )}
          </View>

          <View
            style={[
              tailwind('flex items-start justify-center flex-shrink flex-grow'),
              props.isGrid && tailwind('items-center'),
            ]}
          >
            <Text
              style={[
                tailwind('text-base text-neutral-500'),
                tailwind(props.isGrid ? 'text-center' : 'text-left'),
                globalStyle.fontWeight.medium,
              ]}
              numberOfLines={props.isGrid ? 2 : 1}
              ellipsizeMode={props.isGrid ? 'tail' : 'middle'}
            >
              {props.item.name}
              {props.item.type ? '.' + props.item.type : ''}
            </Text>

            {showSpinner && (
              <Text style={tailwind('text-xs text-neutral-100')}>
                {props.progress === 0 ? 'Encrypting ' : ''}
                {props.progress > 0 ? 'Uploading ' : ''}
                {props.progress < 0 ? (progress === 0 ? 'Fetching file ' : progress >= 0 && 'Downloading ') : ''}
                {progress > 0 &&
                  ((props.progress >= 0 ? (props.progress * 100).toFixed(0) : progress.toFixed(0)) || 0) + '%'}
              </Text>
            )}
            {!props.isGrid &&
              !showSpinner &&
              (props.subtitle ? (
                props.subtitle
              ) : (
                <Text style={tailwind('text-xs text-neutral-100')}>
                  {!props.isFolder && (
                    <>
                      {prettysize(props.item.size)}
                      <Text style={globalStyle.fontWeight.bold}> · </Text>
                    </>
                  )}
                  Updated{' '}
                  {new Date(props.item.updatedAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              ))}
          </View>
        </View>

        {!props.isGrid && (
          <View style={tailwind('items-center px-2 justify-center')}>
            <TouchableOpacity
              style={isSelectionMode ? tailwind('hidden') : tailwind('p-3')}
              onPress={() => {
                dispatch(filesActions.focusItem(props.item));
                dispatch(layoutActions.setShowItemModal(true));
              }}
              onLongPress={() => {
                dispatch(filesActions.focusItem(props.item));
                dispatch(layoutActions.setShowItemModal(true));
              }}
            >
              <Unicons.UilEllipsisH size={24} color={getColor('neutral-60')} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableHighlight>
  );
}

export default FileItem;
