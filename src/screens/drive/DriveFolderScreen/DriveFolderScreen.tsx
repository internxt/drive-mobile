import React, { useMemo, useState } from 'react';
import DriveList from '../../../components/drive/lists/DriveList/DriveList';
import strings from '../../../../assets/lang/strings';
import { driveActions, driveSelectors, driveThunks } from '../../../store/slices/drive';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { RouteProp, useRoute } from '@react-navigation/native';
import AppScreen from '../../../components/AppScreen';
import { DriveListItem, DriveListType, SortDirection, SortType } from '../../../types/drive';
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
  const { isRootFolder, folderId, folderName, parentFolderName } = route.params;
  const tailwind = useTailwind();
  const dispatch = useAppDispatch();
  const driveCtx = useDrive();

  const folder = driveCtx.driveFoldersTree[folderId];

  const folderHasError = folder?.error;
  const folderContent = folder?.content ? drive.folder.folderContentToDriveListItems(folder.content) : [];
  const onBackButtonPressed = () => {
    navigation.goBack();

    if (folder?.content?.parentId) {
      driveCtx.loadFolderContent(folder.content.parentId, { focusFolder: true }).catch(errorService.reportError);
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

  const screenTitle = !isRootFolder
    ? folder?.content
      ? folder.content.name
      : folderName
    : strings.screens.drive.title;
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
        bucketId: driveFile.data.bucket,
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
          shareId: driveItem.data.shareId,
          parentId: driveItem.data.parentId as number,
          size: driveItem.data.size,
          updatedAt: driveItem.data.updatedAt,
          isFolder: driveItem.data.isFolder,
        }),
      );
      handleOnFilePress(driveItem);
    } else if (driveItem.data.folderId) {
      // Prepare the folder content, the Context will pick
      // either cache or network request to retrieve it
      driveCtx.loadFolderContent(driveItem.data.folderId, { focusFolder: true });

      // Navigate to the folder, this is the minimal data
      navigation.push('DriveFolder', {
        folderId: driveItem.data.folderId,
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
    if (!folder?.content) return;

    dispatch(
      driveActions.setFocusedItem({
        ...folder.content,
        id: folder.content.id,
        parentId: folder.content.parentId,
        updatedAt: folder.content.updatedAt,
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

  const getItems = () => {
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
  };

  async function handleRefresh() {
    await driveCtx.loadFolderContent(folderId, { focusFolder: true, pullFrom: ['network'] });
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
            isLoading={driveCtx.driveFoldersTree[folderId] ? false : true}
            isRootFolder={isRootFolder}
            onRefresh={handleRefresh}
            items={getItems()}
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
