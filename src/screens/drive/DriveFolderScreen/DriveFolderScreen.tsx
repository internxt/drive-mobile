import React, { useMemo, useState } from 'react';
import DriveList from '../../../components/drive/lists/DriveList/DriveList';
import strings from '../../../../assets/lang/strings';
import { driveActions, driveSelectors, driveThunks } from '../../../store/slices/drive';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { RouteProp, useRoute } from '@react-navigation/native';
import AppScreen from '../../../components/AppScreen';
import { DriveItemStatus, DriveListItem, DriveListType, SortDirection, SortType } from '../../../types/drive';
import SortModal, { SortMode } from '../../../components/modals/SortModal';
import { DriveScreenProps, DriveStackParamList } from '../../../types/navigation';
import { useTailwind } from 'tailwind-rn';
import Portal from '@burstware/react-native-portal';
import drive from '@internxt-mobile/services/drive';
import { DriveFolderScreenHeader } from './DriveFolderScreenHeader';
import { useHardwareBackPress } from '@internxt-mobile/hooks/common';
import { useDrive } from '@internxt-mobile/hooks/drive';
import { uiActions } from 'src/store/slices/ui';
import { View } from 'react-native';
import { DriveFolderError } from './DriveFolderError';
import { DriveFolderEmpty } from './DriveFolderEmpty';
import errorService from '@internxt-mobile/services/ErrorService';

export function DriveFolderScreen({ navigation }: DriveScreenProps<'DriveFolder'>): JSX.Element {
  const route = useRoute<RouteProp<DriveStackParamList, 'DriveFolder'>>();
  const [loadingMore, setLoadingMore] = useState(false);
  const { isRootFolder, folderId, folderName, parentFolderName, parentId } = route.params;
  const tailwind = useTailwind();
  const dispatch = useAppDispatch();
  const driveCtx = useDrive();

  const folder = driveCtx.driveFoldersTree[folderId];

  const folderHasError = folder?.error;
  const folderFiles = folder?.files || [];
  const folderFolders = folder?.folders || [];
  const folderContent = useMemo<DriveListItem[]>(() => {
    const files = folderFiles.map((file) => {
      return {
        status: DriveItemStatus.Idle,
        id: file.id.toString(),
        data: {
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

  const onBackButtonPressed = () => {
    navigation.goBack();

    if (parentId) {
      driveCtx
        .loadFolderContent(parentId, { pullFrom: ['network'], resetPagination: false })
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
        .concat(folderContent.filter((item) => !item.data.fileId).sort(drive.file.getSortFunction(sortMode)))
        .concat(folderContent.filter((item) => item.data.fileId).sort(drive.file.getSortFunction(sortMode))),
    [sortMode, driveUploadingItems, folderContent],
  );

  /**
   * TODO: WARNING REDUX USAGE OVER HERE, SHOULD REMOVE
   */
  const handleOnFilePress = (driveFile: DriveListItem) => {
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
    const isFolder = driveItem.data.type ? false : true;
    if (!isFolder) {
      dispatch(
        driveActions.setFocusedItem({
          ...driveItem.data,
          id: driveItem.data.id,
          uuid: driveItem.data.uuid,
          shareId: driveItem.data.shareId,
          parentId: driveItem.data.parentId as number,
          size: driveItem.data.size,
          updatedAt: driveItem.data.updatedAt,
          isFolder: driveItem.data.isFolder,
        }),
      );
      handleOnFilePress(driveItem);
    } else if (driveItem.data.folderId) {
      driveCtx.loadFolderContent(driveItem.data.folderId, { focusFolder: true, resetPagination: true });

      // Navigate to the folder, this is the minimal data
      navigation.push('DriveFolder', {
        folderId: driveItem.data.folderId,
        parentId: driveItem.data.parentId as number,
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
        shareId: driveItem.data.shareId,
        parentId: driveItem.data.parentId as number,
        size: driveItem.data.size,
        updatedAt: driveItem.data.updatedAt,
        isFolder: driveItem.data.isFolder,
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
        parentId: focusedFolder.parentId,
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
      await driveCtx.loadFolderContent(folderId, { pullFrom: ['network'], resetPagination: false, focusFolder: true });
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
    await driveCtx.loadFolderContent(folderId, { focusFolder: true, pullFrom: ['network'], resetPagination: true });
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
              label: parentFolderName || '',
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
            isLoading={driveCtx.driveFoldersTree[folderId] ? false : true}
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
