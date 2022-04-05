import React, { useEffect, useState } from 'react';
import { View, Text, Alert, TouchableOpacity, TouchableHighlight, Animated, Easing } from 'react-native';

import analytics, { AnalyticsEventKey } from '../../services/analytics';
import { FolderIcon, getFileTypeIcon } from '../../helpers';
import {
  createEmptyFile,
  exists,
  FileManager,
  getDocumentsDir,
  pathToUri,
  showFileViewer,
} from '../../services/fileSystem';
import { getColor, tailwind } from '../../helpers/designSystem';
import prettysize from 'prettysize';
import globalStyle from '../../styles';
import { DevicePlatform, DriveItemData, FileItemStatus, FileListType, FileListViewMode } from '../../types';
import { storageActions, storageThunks } from '../../store/slices/storage';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { deviceStorage } from '../../services/asyncStorage';
import { uiActions } from '../../store/slices/ui';
import { downloadFile } from '../../services/network';
import { LegacyDownloadRequiredError } from '../../services/network/download';
import { downloadFile as legacyDownloadFile } from '../../services/download';
import { constants } from '../../services/app';
import { ArrowCircleUp, DotsThree } from 'phosphor-react-native';
import strings from '../../../assets/lang/strings';
import ProgressBar from '../ProgressBar';
import { items } from '@internxt/lib';
import AppText from '../AppText';

interface FileItemProps {
  type: FileListType;
  viewMode: FileListViewMode;
  status: FileItemStatus;
  data: DriveItemData;
  isLoading?: boolean;
  nameEncrypted?: boolean;
  selectable?: boolean;
  subtitle?: JSX.Element;
  progress?: number;
}

function FileItem(props: FileItemProps): JSX.Element {
  const dispatch = useAppDispatch();
  const { selectedItems } = useAppSelector((state) => state.storage);
  const { user } = useAppSelector((state) => state.auth);
  const isSelectionMode = selectedItems.length > 0;
  const [downloadProgress, setDownloadProgress] = useState(-1);
  const [decryptionProgress, setDecryptionProgress] = useState(-1);
  const [isLoading, setIsLoading] = useState(!!props.isLoading);
  const spinValue = new Animated.Value(1);
  const isFolder = !!props.data.parentId;
  const isGrid = props.viewMode === FileListViewMode.Grid;
  const isIdle = props.status === 'idle';
  const isUploading = props.status === FileItemStatus.Uploading;
  const isDownloading = props.status === FileItemStatus.Downloading;
  const IconFile = getFileTypeIcon(props.data.type);
  const iconSize = isGrid ? 64 : 40;
  const onItemLongPressed = () => {
    if (isGrid) {
      dispatch(storageActions.focusItem(props.data));
      dispatch(uiActions.setShowItemModal(true));
    }
  };
  async function onItemPressed() {
    if (isLoading) {
      return;
    }

    if (isFolder) {
      onFolderPressed();
    } else {
      onFilePressed();
    }
  }
  function onFolderPressed() {
    trackFolderOpened();
    dispatch(storageThunks.getFolderContentThunk({ folderId: props.data.id }));
    dispatch(storageActions.addDepthAbsolutePath([props.data.name]));
  }
  async function onFilePressed(): Promise<void> {
    if (!isIdle) {
      return;
    }

    setIsLoading(true);

    const { name, type } = props.data;
    const destinationDir = await getDocumentsDir();
    let destinationPath = destinationDir + '/' + name + (type ? '.' + type : '');

    trackDownloadStart();
    setDownloadProgress(0);
    dispatch(storageActions.downloadSelectedFileStart());

    const fileAlreadyExists = await exists(destinationPath);

    if (fileAlreadyExists) {
      destinationPath = destinationDir + '/' + name + '-' + Date.now().toString() + (type ? '.' + type : '');
    }

    await createEmptyFile(destinationPath);
    await download({
      fileId: props.data.fileId.toString(),
      to: destinationPath,
    })
      .then(() => {
        trackDownloadSuccess();

        return showFileViewer(pathToUri(destinationPath));
      })
      .catch((err) => {
        trackDownloadError(err);

        Alert.alert('Error downloading file', err.message);
      })
      .finally(() => {
        dispatch(storageActions.downloadSelectedFileStop());
        setDownloadProgress(-1);
        setDecryptionProgress(-1);
        setIsLoading(false);
      });
  }
  async function download(params: { fileId: string; to: string }) {
    const { bucket, bridgeUser, userId, mnemonic } = await deviceStorage.getUser();

    return downloadFile(
      bucket,
      params.fileId,
      {
        encryptionKey: mnemonic,
        user: bridgeUser,
        password: userId,
      },
      constants.REACT_NATIVE_BRIDGE_URL,
      {
        toPath: params.to,
        downloadProgressCallback: setDownloadProgress,
        decryptionProgressCallback: setDecryptionProgress,
      },
    ).catch((err) => {
      if (err instanceof LegacyDownloadRequiredError) {
        const fileManager = new FileManager(params.to);

        return legacyDownloadFile(params.fileId, {
          fileManager,
          progressCallback: setDownloadProgress,
        });
      } else {
        throw err;
      }
    });
  }
  function trackDownloadStart() {
    return analytics.track(AnalyticsEventKey.FileDownloadStart, {
      file_id: props.data.id,
      file_size: props.data.size,
      file_type: props.data.type,
      folder_id: props.data.folderId || null,
      platform: DevicePlatform.Mobile,
      email: user?.email || null,
      userId: user?.uuid || null,
    });
  }
  function trackDownloadSuccess() {
    return analytics.track(AnalyticsEventKey.FileDownloadFinished, {
      file_id: props.data.id,
      file_size: props.data.size,
      file_type: props.data.type,
      folder_id: props.data.folderId || null,
      platform: DevicePlatform.Mobile,
      email: user?.email || null,
      userId: user?.uuid || null,
    });
  }
  function trackDownloadError(err: Error) {
    return analytics.track(AnalyticsEventKey.FileDownloadError, {
      file_id: props.data.id,
      file_size: props.data.size,
      file_type: props.data.type,
      folder_id: props.data.folderId || null,
      platform: DevicePlatform.Mobile,
      error: err.message,
      email: user?.email || null,
      userId: user?.uuid || null,
    });
  }
  function trackFolderOpened() {
    return analytics.track(AnalyticsEventKey.FolderOpened, {
      folder_id: props.data.id,
      email: user?.email || null,
      userId: user?.uuid || null,
    });
  }
  const onActionsButtonPressed = () => {
    dispatch(storageActions.focusItem(props.data));
    dispatch(uiActions.setShowItemModal(true));
  };

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 0,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, []);

  return (
    <TouchableHighlight
      style={isGrid && tailwind('py-1.5 flex-1')}
      disabled={isUploading || isDownloading}
      underlayColor={getColor('neutral-20')}
      onLongPress={onItemLongPressed}
      onPress={onItemPressed}
    >
      <View style={!isGrid && tailwind('flex-row')}>
        <View
          style={[
            tailwind('flex-grow flex-shrink overflow-hidden'),
            tailwind(isGrid ? 'flex-col items-center' : 'flex-row'),
          ]}
        >
          <View style={[tailwind('my-3 ml-5 mr-4'), isUploading && tailwind('opacity-40')]}>
            {isFolder ? (
              <FolderIcon width={iconSize} height={iconSize} />
            ) : (
              <IconFile width={iconSize} height={iconSize} />
            )}
          </View>

          <View
            style={[
              tailwind('flex items-start justify-center flex-shrink flex-grow'),
              isGrid && tailwind('items-center'),
            ]}
          >
            <Text
              style={[
                isUploading && tailwind('opacity-40'),
                tailwind('text-base text-neutral-500'),
                tailwind(isGrid ? 'text-center px-1.5' : 'text-left'),
                globalStyle.fontWeight.medium,
              ]}
              numberOfLines={1}
              ellipsizeMode={'middle'}
            >
              {items.getItemDisplayName(props.data)}
            </Text>

            {isUploading &&
              (props.progress === 0 ? (
                <Text style={tailwind('text-xs text-blue-60')}>{strings.screens.drive.encrypting}</Text>
              ) : (
                <View style={tailwind('flex-row items-center')}>
                  <ArrowCircleUp weight="fill" color={getColor('blue-60')} size={16} />
                  <AppText style={tailwind('ml-1.5 text-xs text-blue-60')}>
                    {((props.progress || 0) * 100).toFixed(0) + '%'}
                  </AppText>
                  <ProgressBar
                    style={tailwind('flex-grow h-1 ml-1.5')}
                    progressStyle={tailwind('h-1')}
                    totalValue={1}
                    currentValue={props.progress || 0}
                  />
                </View>
              ))}

            {isDownloading && (
              <Text style={tailwind('text-xs text-blue-60')}>
                {downloadProgress >= 0 &&
                  downloadProgress < 1 &&
                  'Downloading ' + (downloadProgress * 100).toFixed(0) + '%'}
                {downloadProgress >= 1 && decryptionProgress === -1 && 'Decrypting'}
                {decryptionProgress >= 0 && 'Decrypting ' + Math.max(decryptionProgress * 100, 0).toFixed(0) + '%'}
              </Text>
            )}

            {!isGrid &&
              isIdle &&
              (props.subtitle ? (
                props.subtitle
              ) : (
                <Text style={tailwind('text-xs text-neutral-100')}>
                  {!isFolder && (
                    <>
                      {prettysize(props.data.size)}
                      <Text style={globalStyle.fontWeight.bold}> · </Text>
                    </>
                  )}
                  Updated{' '}
                  {new Date(props.data.updatedAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              ))}
          </View>
        </View>

        {!isGrid && (
          <TouchableOpacity
            disabled={isUploading || isDownloading}
            style={isSelectionMode && tailwind('hidden')}
            onPress={onActionsButtonPressed}
            onLongPress={onActionsButtonPressed}
          >
            <View style={[isUploading && tailwind('opacity-40'), tailwind('px-5 flex-1 items-center justify-center')]}>
              <DotsThree weight="bold" size={22} color={getColor('neutral-60')} />
            </View>
          </TouchableOpacity>
        )}
      </View>
    </TouchableHighlight>
  );
}

export default FileItem;
