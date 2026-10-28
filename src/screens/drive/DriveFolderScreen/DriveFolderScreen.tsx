import Portal from '@burstware/react-native-portal';
import { FLOATING_BUTTON_CLEARANCE } from 'src/components/FloatingActionButton/floatingButtonLayout';
import { useHardwareBackPress, useStableCallback } from '@internxt-mobile/hooks/common';
import { useDrive } from '@internxt-mobile/hooks/drive';
import drive from '@internxt-mobile/services/drive';
import errorService from '@internxt-mobile/services/ErrorService';
import { RouteProp, useFocusEffect, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { uiActions } from 'src/store/slices/ui';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../../assets/lang/strings';
import AppScreen from '../../../components/AppScreen';
import DriveList from '../../../components/drive/lists/DriveList/DriveList';
import SortModal from '../../../components/modals/SortModal';
import { useLanguage } from '../../../hooks/useLanguage';
import { logger } from '../../../services/common';
import { folderUploadCancellationService } from '../../../services/drive/folder/folderUploadCancellation.service';
import notificationsService from '../../../services/NotificationsService';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { driveActions, driveSelectors, driveThunks } from '../../../store/slices/drive';
import { NotificationType } from '../../../types';
import { DriveItemStatus, DriveListItem } from '../../../types/drive/item';
import { DriveListType, SortMode } from '../../../types/drive/ui';
import { DriveScreenProps, DriveStackParamList } from '../../../types/navigation';
import { DriveFolderEmpty } from './DriveFolderEmpty';
import { DriveFolderError } from './DriveFolderError';
import {
  buildFolderUploadListItem,
  canLoadNextPage,
  canSelectDriveItem,
  hasUnloadedPages,
  isFolderUploadItem,
} from './DriveFolderScreen.helpers';
import { DriveFolderScreenHeader } from './DriveFolderScreenHeader';
import { DriveSelectionActionsModal } from './DriveSelectionActionsModal';
import { DriveSelectionToolbar } from './DriveSelectionToolbar';
import { useDeepLinkNavigationResolver } from './useDeepLinkNavigationResolver';
import { useDriveSelection } from './useDriveSelection';
import { useFocusFolderOnScreenFocus } from './useFocusFolderOnScreenFocus';
import { useTrashSelectedItems } from './useTrashSelectedItems';
import { useReloadFolderInChosenSort } from './useReloadFolderInChosenSort';

const ROOT_HEADER_TOP_MARGIN = 22;

export function DriveFolderScreen({ navigation }: DriveScreenProps<'DriveFolder'>): JSX.Element {
  const route = useRoute<RouteProp<DriveStackParamList, 'DriveFolder'>>();
  useLanguage();
  const [loadingMore, setLoadingMore] = useState(false);
  const isLoadingNextPageRef = useRef(false);
  const { folderUuid, folderName, parentFolderName } = route.params;
  const { user } = useAppSelector((state) => state.auth);
  const isRootFolder = folderUuid === user?.rootFolderId;

  const tailwind = useTailwind();
  const dispatch = useAppDispatch();
  const driveCtx = useDrive();
  const { downloadingFile } = useAppSelector((state) => state.drive);

  const hasNoNavigationHistory = navigation.getState().index === 0;
  const isDeepLinked = !isRootFolder && hasNoNavigationHistory;

  useDeepLinkNavigationResolver(folderUuid, isDeepLinked, navigation);
  useReloadFolderInChosenSort(folderUuid);
  useFocusFolderOnScreenFocus(folderUuid);

  const folder = driveCtx.driveFoldersTree[folderUuid];

  const folderHasError = folder?.error;
  const folderFiles = folder?.files ?? [];
  const folderFolders = folder?.folders ?? [];
  const folderContent = useMemo<DriveListItem[]>(() => {
    const files = folderFiles.map((file) => {
      return {
        status: DriveItemStatus.Idle,
        id: file.uuid,
        data: {
          folderUuid: file.folderUuid,
          uuid: file.uuid,
          name: file.plainName,
          size: file.size,
          createdAt: file.createdAt,
          updatedAt: file.updatedAt,
          fileId: file.fileId,
          bucket: file.bucket,
          type: file.type,
          isFolder: false,
          currentThumbnail: null,
          thumbnails: file.thumbnails,
        },
      } as DriveListItem;
    });

    const folders = folderFolders.map((folder) => {
      const driveListItem: DriveListItem = {
        status: DriveItemStatus.Idle,
        id: folder.uuid,
        data: {
          uuid: folder.uuid,
          parentUuid: folder.parentUuid,
          name: folder.plainName,
          createdAt: folder.createdAt,
          updatedAt: folder.updatedAt,
          isFolder: true,
          currentThumbnail: null,
          thumbnails: [],
        },
      };

      return driveListItem;
    });

    return folders.concat(files);
  }, [folderFiles, folderFolders]);

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
          errorService.reportError(error);
          const err = errorService.castError(error, 'content');
          notificationsService.show({
            type: NotificationType.Error,
            text1: err.message,
          });
        });
    }
  }, [folderUuid]);

  const [searchVisible, setSearchVisible] = useState(isRootFolder);
  const [searchValue, setSearchValue] = useState('');

  const [sortModalOpen, setSortModalOpen] = useState(false);
  const [isSelectionActionsModalOpen, setIsSelectionActionsModalOpen] = useState(false);
  const { sortMode } = driveCtx;

  const { uploading: driveUploadingItems } = useAppSelector(driveSelectors.driveItems);
  const folderUploads = useAppSelector((state) => state.drive.folderUploads);

  const screenTitle = isRootFolder ? strings.screens.drive.title : (folderName ?? folder?.name);

  const driveSortedItems = useMemo(() => {
    const folderUploadItems = Object.values(folderUploads).map(buildFolderUploadListItem);
    return folderUploadItems
      .concat(driveUploadingItems)
      .concat(folderContent.filter((item) => item.data.isFolder).sort(drive.file.getSortFunction(sortMode)))
      .concat(folderContent.filter((item) => !item.data.isFolder).sort(drive.file.getSortFunction(sortMode)));
  }, [sortMode, driveUploadingItems, folderContent, folderUploads]);

  const driveItems = useMemo(() => {
    if (searchValue.length) {
      return driveSortedItems.filter((item) => {
        return item.data.name.toLowerCase().includes(searchValue.toLowerCase());
      });
    }
    return driveSortedItems;
  }, [driveSortedItems, searchValue]);

  const folderItemUuids = useMemo(() => folderContent.map((item) => item.data.uuid), [folderContent]);
  const visibleItemUuids = useMemo(
    () => driveItems.filter(canSelectDriveItem).map((item) => item.data.uuid),
    [driveItems],
  );

  const selection = useDriveSelection({
    folderItemUuids,
    visibleItemUuids,
    hasUnloadedItems: hasUnloadedPages(folder),
    loadRemainingItems: () => driveCtx.loadFolderContent(folderUuid, { loadAllContent: true }),
  });
  const shouldShowSelectionToolbar = selection.isSelectionMode && selection.selectedUuids.size > 0;
  const selectionTrash = useTrashSelectedItems({ folderUuid, onTrashed: selection.exitSelectionMode });

  const onBackButtonPressed = () => {
    if (selection.isSelectionMode) {
      selection.exitSelectionMode();
      return;
    }
    navigation.goBack();
  };

  // Register a handler for hardware back
  useHardwareBackPress(onBackButtonPressed);

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
        folderUuid: driveFile.data.folderUuid ?? undefined,
        name: driveFile.data.name,
        type: driveFile.data.type as string,
        fileId: driveFile.data.fileId as string,
        updatedAt: new Date(driveFile.data.updatedAt).toISOString(),
        uuid: driveFile.data.uuid,
        openFileViewer: false,
      }),
    );
    const downloadAbort = () => {
      thunk.abort();
    };

    drive.events.setDownloadAbort(downloadAbort);

    navigation.navigate('DrivePreview');
  };

  const handleDriveItemPress = useStableCallback((driveItem: DriveListItem) => {
    if (!navigation.isFocused()) {
      return;
    }

    if (selection.isSelectionMode) {
      if (canSelectDriveItem(driveItem)) {
        selection.toggleSelection(driveItem.data.uuid);
      }
      return;
    }

    const isFolder = driveItem?.data?.isFolder;

    if (!isFolder) {
      dispatch(
        driveActions.setFocusedItem({
          ...driveItem.data,
          uuid: driveItem.data.uuid ?? undefined,
          folderUuid: driveItem.data.folderUuid ?? undefined,
          shareId: driveItem.data.shareId,
          size: driveItem.data.size,
          updatedAt: driveItem.data.updatedAt,
          isFolder: driveItem.data.isFolder,
          bucket: driveItem.data.bucket ?? undefined,
        }),
      );
      handleOnFilePress(driveItem);
    } else if (driveItem.data.uuid && !isFolderUploadItem(driveItem)) {
      driveCtx.loadFolderContent(driveItem.data.uuid, { focusFolder: true, resetPagination: true }).catch((error) => {
        errorService.reportError(error);
        const err = errorService.castError(error, 'content');
        notificationsService.show({
          type: NotificationType.Error,
          text1: err.message,
        });
      });

      // Navigate to the folder, this is the minimal data
      navigation.push('DriveFolder', {
        folderUuid: driveItem.data.uuid as string,
        parentUuid: driveItem.data.parentUuid as string,
        parentFolderName: screenTitle,
        folderName: driveItem.data.name,
      });
    }
  });

  const handleDriveItemActionsPress = useStableCallback((driveItem: DriveListItem) => {
    if (selection.isSelectionMode && canSelectDriveItem(driveItem)) {
      handleDriveItemPress(driveItem);
      return;
    }

    if (isFolderUploadItem(driveItem)) {
      const uploadId = driveItem.data.uuid;
      folderUploadCancellationService.cancel(uploadId);
      dispatch(driveActions.removeFolderUpload(uploadId));
      return;
    }

    openDriveItemMenu(driveItem);
  });

  const openDriveItemMenu = (driveItem: DriveListItem) => {
    dispatch(
      driveActions.setFocusedItem({
        ...driveItem.data,
        folderUuid: driveItem.data.folderUuid ?? undefined,
        shareId: driveItem.data.shareId,
        size: driveItem.data.size,
        updatedAt: driveItem.data.updatedAt,
        isFolder: driveItem.data.isFolder,
        bucket: driveItem.data.bucket ?? undefined,
      }),
    );

    dispatch(uiActions.setShowItemModal(true));
  };

  const handleSelectionMorePress = () => {
    if (selection.selectedUuids.size !== 1) {
      setIsSelectionActionsModalOpen(true);
      return;
    }
    const [selectedUuid] = selection.selectedUuids;
    const selectedItem = driveSortedItems.find((item) => item.data.uuid === selectedUuid);
    if (selectedItem) {
      openDriveItemMenu(selectedItem);
    }
  };

  const handleTrashSelectedItemsPress = () => {
    setIsSelectionActionsModalOpen(false);
    const selectedItems = driveSortedItems.filter((item) => selection.selectedUuids.has(item.data.uuid));
    selectionTrash.trashItems(selectedItems).catch((error) => {
      errorService.reportError(error);
    });
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
    driveCtx.changeSortMode(mode);
    setTimeout(() => setSortModalOpen(false), 1);
  };

  const onCloseSortModal = () => {
    setSortModalOpen(false);
  };

  const handleEndReached = async () => {
    if (isLoadingNextPageRef.current || !canLoadNextPage(folder)) {
      return;
    }

    isLoadingNextPageRef.current = true;
    setLoadingMore(true);
    try {
      await driveCtx.loadFolderContent(folderUuid, {
        pullFrom: ['network'],
        resetPagination: false,
      });
    } catch (error) {
      errorService.reportError(error);
      const err = errorService.castError(error, 'content');
      notificationsService.show({
        type: NotificationType.Error,
        text1: err.message,
      });
    } finally {
      isLoadingNextPageRef.current = false;
      setLoadingMore(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      return () => selection.exitSelectionMode();
    }, []),
  );

  useEffect(() => {
    const frameRequestId = requestAnimationFrame(() => {
      dispatch(uiActions.setIsTabBarHidden(shouldShowSelectionToolbar));
    });
    return () => cancelAnimationFrame(frameRequestId);
  }, [shouldShowSelectionToolbar]);

  useEffect(
    () => () => {
      dispatch(uiActions.setIsTabBarHidden(false));
    },
    [],
  );

  const handleDriveItemLongPress = useStableCallback((driveItem: DriveListItem) => {
    if (!canSelectDriveItem(driveItem)) {
      handleDriveItemActionsPress(driveItem);
      return;
    }
    if (selection.isSelectionMode) {
      selection.toggleSelection(driveItem.data.uuid);
      return;
    }
    selection.enterSelectionMode(driveItem.data.uuid);
  });

  const handleSelectPress = () => {
    selection.enterSelectionMode();
  };

  const handleSelectAllPress = () => {
    selection.toggleSelectAll().catch((error) => {
      errorService.reportError(error);
      const err = errorService.castError(error, 'content');
      notificationsService.show({
        type: NotificationType.Error,
        text1: err.message,
      });
    });
  };

  async function handleRefresh() {
    try {
      await driveCtx.loadFolderContent(folderUuid, {
        focusFolder: true,
        pullFrom: ['network'],
        resetPagination: true,
      });
    } catch (error) {
      errorService.reportError(error);
      const err = errorService.castError(error, 'content');
      notificationsService.show({
        type: NotificationType.Error,
        text1: err.message,
      });
    }
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
        <DriveSelectionActionsModal
          isOpen={isSelectionActionsModalOpen}
          selectedCount={selection.selectedUuids.size}
          trashDisabled={selectionTrash.isTrashing}
          onTrashPress={handleTrashSelectedItemsPress}
          onClose={() => setIsSelectionActionsModalOpen(false)}
        />
      </Portal>

      <AppScreen safeAreaTop style={tailwind('flex-1')}>
        <View style={{ marginTop: isRootFolder ? ROOT_HEADER_TOP_MARGIN : 0 }}>
          <DriveFolderScreenHeader
            onFolderActionsPress={handleFolderActionsPress}
            title={screenTitle}
            backButtonConfig={{
              label: parentFolderName ?? strings.screens.drive.title,
              canGoBack: !isRootFolder,
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
            selectionConfig={
              selection.isSelectionMode
                ? {
                    selectedCount: selection.selectedUuids.size,
                    checkState: selection.selectionCheckState,
                    isSelectingAll: selection.isSelectingAll,
                    onSelectAllPress: handleSelectAllPress,
                    onCancelPress: selection.exitSelectionMode,
                  }
                : undefined
            }
            onSelectPress={!selection.isSelectionMode && visibleItemUuids.length > 0 ? handleSelectPress : undefined}
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
            isLoading={driveCtx.driveFoldersTree[folderUuid]?.loading}
            isLoadingMore={loadingMore}
            isRootFolder={isRootFolder}
            onRefresh={handleRefresh}
            items={driveItems}
            type={DriveListType.Drive}
            viewMode={driveCtx.viewMode}
            onDriveItemPress={handleDriveItemPress}
            onDriveItemActionsPress={handleDriveItemActionsPress}
            onDriveItemLongPress={handleDriveItemLongPress}
            isSelectionMode={selection.isSelectionMode}
            selectedUuids={selection.selectedUuids}
            canSelectItem={canSelectDriveItem}
            contentContainerStyle={{ paddingBottom: FLOATING_BUTTON_CLEARANCE }}
          />
        )}
        <DriveSelectionToolbar
          visible={shouldShowSelectionToolbar}
          trashDisabled={selectionTrash.isTrashing}
          onTrashPress={handleTrashSelectedItemsPress}
          onMorePress={handleSelectionMorePress}
        />
      </AppScreen>
    </>
  );
}
