import Portal from '@burstware/react-native-portal';
import { useHardwareBackPress } from '@internxt-mobile/hooks/common';
import { useDrive } from '@internxt-mobile/hooks/drive';
import drive from '@internxt-mobile/services/drive';
import errorService from '@internxt-mobile/services/ErrorService';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { uiActions } from 'src/store/slices/ui';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../../assets/lang/strings';
import AppScreen from '../../../components/AppScreen';
import DriveList from '../../../components/drive/lists/DriveList/DriveList';
import SortModal, { SortMode } from '../../../components/modals/SortModal';
import { logger } from '../../../services/common';
import notificationsService from '../../../services/NotificationsService';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { driveActions, driveSelectors, driveThunks } from '../../../store/slices/drive';
import { NotificationType } from '../../../types';
import { DriveItemStatus, DriveListItem } from '../../../types/drive/item';
import { SortDirection, SortType } from '../../../types/drive/ui';
import { DriveListType } from '../../../types/drive/ui';
import { DriveScreenProps, DriveStackParamList } from '../../../types/navigation';
import { DriveFolderEmpty } from './DriveFolderEmpty';
import { DriveFolderError } from './DriveFolderError';
import { DriveFolderScreenHeader } from './DriveFolderScreenHeader';

export function DriveFolderScreen({ navigation }: DriveScreenProps<'DriveFolder'>): JSX.Element {
  const route = useRoute<RouteProp<DriveStackParamList, 'DriveFolder'>>();
  const [loadingMore, setLoadingMore] = useState(false);
  const { isRootFolder, folderUuid, folderName, parentFolderName, parentUuid } = route.params;

  const tailwind = useTailwind();
  const dispatch = useAppDispatch();
  const driveCtx = useDrive();
  const { downloadingFile } = useAppSelector((state) => state.drive);

  const folder = driveCtx.driveFoldersTree[folderUuid];

  const folderHasError = folder?.error;
  const folderFiles = folder?.files ?? [];
  const folderFolders = folder?.folders ?? [];
  const folderContent = useMemo<DriveListItem[]>(() => {
    const files = folderFiles.map((file) => {
      return {
        status: DriveItemStatus.Idle,
        id: file.id.toString(),
        data: {
          folderUuid: file.folderUuid,
          uuid: file.uuid,
          name: file.plainName,
          size: file.size,
          createdAt: file.createdAt,
          updatedAt: file.updatedAt,
          fileId: file.fileId,
          folderId: file.folderId,
          bucket: file.bucket,
          type: file.type,
          isFolder: false,
          currentThumbnail: null,
          id: file.id,
          thumbnails: file.thumbnails,
        },
      } as DriveListItem;
    });

    const folders = folderFolders.map((folder) => {
      const driveListItem: DriveListItem = {
        status: DriveItemStatus.Idle,
        id: folder.id.toString(),
        data: {
          uuid: folder.uuid,
          parentUuid: folder.parentUuid,
          name: folder.plainName,
          createdAt: folder.createdAt,
          updatedAt: folder.updatedAt,
          folderId: folder.id,
          parentId: folder.parentId,
          isFolder: true,
          currentThumbnail: null,
          id: folder.id,
          thumbnails: [],
        },
      };

      return driveListItem;
    });

    return folders.concat(files);
  }, [folderFiles]);

  useEffect(() => {
    // to ensure that the folder content is loaded when new folder is focused
    const currentFocusedFolder = driveCtx.focusedFolder;
    if (currentFocusedFolder?.uuid !== folderUuid) {
      driveCtx
        .loadFolderContent(folderUuid, {
          focusFolder: true,
          resetPagination: false,
        })
        .catch((error) => {
          logger.error('Error loading folder content in DriveFolderScreen:', error);
        });
    }
  }, [folderUuid]);

  const onBackButtonPressed = () => {
    navigation.goBack();

    if (parentUuid) {
      driveCtx
        .loadFolderContent(parentUuid, { pullFrom: ['network'], resetPagination: false, focusFolder: true })
        .catch(errorService.reportError);
    }
  };

  // Register a handler for hardware back
  useHardwareBackPress(onBackButtonPressed);
  const [searchVisible, setSearchVisible] = useState(isRootFolder ? true : false);
  const [searchValue, setSearchValue] = useState('');

  const [sortModalOpen, setSortModalOpen] = useState(false);
  const [sortMode, setSortMode] = useState({
    type: SortType.Name,
    direction: SortDirection.Asc,
  });

  const { uploading: driveUploadingItems } = useAppSelector(driveSelectors.driveItems);

  const screenTitle = !isRootFolder ? folderName ?? folder.name : strings.screens.drive.title;

  const driveSortedItems = useMemo(
    () =>
      driveUploadingItems
        .concat(folderContent.filter((item) => item.data.isFolder).sort(drive.file.getSortFunction(sortMode)))
        .concat(folderContent.filter((item) => !item.data.isFolder).sort(drive.file.getSortFunction(sortMode))),
    [sortMode, driveUploadingItems, folderContent],
  );

  /**
   * TODO: WARNING REDUX USAGE OVER HERE, SHOULD REMOVE
   */
  const handleOnFilePress = (driveFile: DriveListItem) => {
    const isCurrentFileDownloading = downloadingFile?.data.fileId === driveFile.data.fileId;
    if (isCurrentFileDownloading) {
      dispatch(driveThunks.cancelDownloadThunk());

      notificationsService.show({
        type: NotificationType.Info,
        text1: strings.errors.fileAlreadyDownloading,
      });
      return;
    }
    const thunk = dispatch(
      driveThunks.downloadFileThunk({
        ...driveFile,
        bucketId: driveFile.data.bucket as string,
        size: driveFile.data.size as number,
        parentId: driveFile.data.parentId as number,
        name: driveFile.data.name,
        type: driveFile.data.type as string,
        fileId: driveFile.data.fileId as string,
        updatedAt: new Date(driveFile.data.updatedAt).toISOString(),
        id: driveFile.data.id,
        openFileViewer: false,
      }),
    );
    const downloadAbort = () => {
      thunk.abort();
    };

    drive.events.setDownloadAbort(downloadAbort);

    navigation.navigate('DrivePreview');
  };

  const handleDriveItemPress = (driveItem: DriveListItem) => {
    const isFolder = driveItem?.data?.isFolder;

    if (!isFolder) {
      dispatch(
        driveActions.setFocusedItem({
          ...driveItem.data,
          id: driveItem.data.id,
          uuid: driveItem.data.uuid ?? undefined,
          folderUuid: driveItem.data.folderUuid ?? undefined,
          shareId: driveItem.data.shareId,
          parentId: driveItem.data.parentId as number,
          size: driveItem.data.size,
          updatedAt: driveItem.data.updatedAt,
          isFolder: driveItem.data.isFolder,
          bucket: driveItem.data.bucket ?? undefined,
        }),
      );
      handleOnFilePress(driveItem);
    } else if (driveItem.data.uuid) {
      driveCtx.loadFolderContent(driveItem.data.uuid, { focusFolder: true, resetPagination: true });

      // Navigate to the folder, this is the minimal data
      navigation.push('DriveFolder', {
        folderUuid: driveItem.data.uuid as string,
        parentUuid: driveItem.data.parentUuid as string,
        parentFolderName: screenTitle,
        folderName: driveItem.data.name,
        isRootFolder: false,
      });
    }
  };

  const handleDriveItemActionsPress = (driveItem: DriveListItem) => {
    dispatch(
      driveActions.setFocusedItem({
        ...driveItem.data,
        id: driveItem.data.id,
        folderUuid: driveItem.data.folderUuid ?? undefined,
        shareId: driveItem.data.shareId,
        parentId: driveItem.data.parentId as number,
        size: driveItem.data.size,
        updatedAt: driveItem.data.updatedAt,
        isFolder: driveItem.data.isFolder,
        bucket: driveItem.data.bucket ?? undefined,
      }),
    );

    dispatch(uiActions.setShowItemModal(true));
  };

  const handleSortButtonPress = () => {
    setSortModalOpen(true);
  };

  const handleSearchTextChange = (value: string) => {
    setSearchValue(value);
  };

  const handleSearchButtonPress = () => {
    setSearchVisible(!searchVisible);
  };

  const handleViewModeButtonPress = async () => {
    driveCtx.toggleViewMode();
  };

  const handleFolderActionsPress = () => {
    const focusedFolder = driveCtx.focusedFolder;
    if (!focusedFolder) return;

    dispatch(
      driveActions.setFocusedItem({
        id: focusedFolder.id,
        uuid: focusedFolder.uuid,
        parentUuid: focusedFolder.parentId,
        updatedAt: focusedFolder.updatedAt,
        name: focusedFolder.name,
        isFromFolderActions: true,
        isFolder: true,
      }),
    );
    dispatch(uiActions.setShowItemModal(true));
  };

  const onSortModeChange = (mode: SortMode) => {
    setSortMode(mode);
    setTimeout(() => setSortModalOpen(false), 1);
  };

  const onCloseSortModal = () => {
    setSortModalOpen(false);
  };

  const handleEndReached = async () => {
    try {
      if (loadingMore) return;
      setLoadingMore(true);
      await driveCtx.loadFolderContent(folderUuid, {
        pullFrom: ['network'],
        resetPagination: false,
      });
    } catch (error) {
      errorService.reportError(error);
    } finally {
      setLoadingMore(false);
    }
  };

  const driveItems = useMemo(() => {
    if (searchValue.length) {
      return driveSortedItems.filter((item) => {
        return item.data.name.toLowerCase().includes(searchValue.toLowerCase());
      });
    }
    return driveSortedItems.map((item) => {
      return {
        ...item,
      };
    });
  }, [driveSortedItems, searchValue]);

  async function handleRefresh() {
    await driveCtx.loadFolderContent(folderUuid, {
      focusFolder: true,
      pullFrom: ['network'],
      resetPagination: true,
    });
  }

  return (
    <>
      <Portal>
        <SortModal
          isOpen={sortModalOpen}
          sortMode={sortMode}
          onSortModeChange={onSortModeChange}
          onClose={onCloseSortModal}
        />
      </Portal>

      <AppScreen safeAreaTop style={tailwind('flex-1')}>
        <View style={{ marginTop: isRootFolder ? 22 : 0 }}>
          <DriveFolderScreenHeader
            onFolderActionsPress={handleFolderActionsPress}
            title={screenTitle}
            backButtonConfig={{
              label: parentFolderName ?? '',
              canGoBack: isRootFolder ? false : true,
              onBackButtonPressed,
            }}
            searchConfig={{
              searchVisible,
              searchValue,
              onSearchTextChange: handleSearchTextChange,
              onSearchButtonPress: handleSearchButtonPress,
            }}
            sortConfig={{
              sortMode,
              onSortButtonPress: handleSortButtonPress,
            }}
            viewConfig={{
              viewMode: driveCtx.viewMode,
              onViewModeButtonPress: handleViewModeButtonPress,
            }}
          />
        </View>
        {folderHasError ? (
          <View style={tailwind('flex-1 flex justify-center px-8')}>
            <DriveFolderError
              error={{
                title: strings.errors.driveFolderContent.title,
                message: strings.errors.driveFolderContent.message,
              }}
              tryAgainLabel={strings.buttons.tryAgain}
              onTryAgain={handleRefresh}
            />
          </View>
        ) : (
          <DriveList
            renderEmpty={() => (
              <View style={tailwind('flex-1 flex justify-center px-8')}>
                <DriveFolderEmpty
                  title={strings.screens.drive.emptyFolder.title}
                  message={strings.screens.drive.emptyFolder.message}
                />
              </View>
            )}
            onEndReached={handleEndReached}
            isLoading={driveCtx.driveFoldersTree[folderUuid].loading}
            isRootFolder={isRootFolder}
            onRefresh={handleRefresh}
            items={driveItems}
            type={DriveListType.Drive}
            viewMode={driveCtx.viewMode}
            onDriveItemPress={handleDriveItemPress}
            onDriveItemActionsPress={handleDriveItemActionsPress}
          />
        )}
      </AppScreen>
    </>
  );
}
