import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, View, BackHandler, TouchableOpacity } from 'react-native';
import DriveList from '../../components/drive/lists/DriveList/DriveList';
import analytics from '../../services/AnalyticsService';
import storageService from '../../services/StorageService';
import strings from '../../../assets/lang/strings';
import globalStyle from '../../styles/global';
import ScreenTitle from '../../components/AppScreenTitle';
import Separator from '../../components/AppSeparator';
import { AsyncStorageKey, DevicePlatform } from '../../types';
import { driveActions, driveSelectors, driveThunks } from '../../store/slices/drive';
import { uiActions } from '../../store/slices/ui';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import AppScreen from '../../components/AppScreen';
import { ArrowDown, ArrowUp, CaretLeft, DotsThree, MagnifyingGlass, Rows, SquaresFour } from 'phosphor-react-native';
import asyncStorage from '../../services/AsyncStorageService';
import { DriveListType, DriveListViewMode, SortDirection, SortType } from '../../types/drive';
import SortModal, { SortMode } from '../../components/modals/SortModal';

import { TabExplorerScreenProps } from '../../types/navigation';
import { useTailwind } from 'tailwind-rn';
import useGetColor from '../../hooks/useColor';
import Portal from '@burstware/react-native-portal';
import drive from '@internxt-mobile/services/drive';
import { SearchInput } from 'src/components/SearchInput';
import asyncStorageService from '../../services/AsyncStorageService';

function DriveScreen({ navigation }: TabExplorerScreenProps<'Drive'>): JSX.Element {
  const route = useRoute();
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const dispatch = useAppDispatch();
  const [viewMode, setViewMode] = useState(DriveListViewMode.List);
  const currentFolder = useAppSelector(driveSelectors.navigationStackPeek);
  const { id: currentFolderId, name: currentFolderName, parentId: currentFolderParentId } = currentFolder;

  useFocusEffect(
    useCallback(() => {
      handleRefresh();
    }, [currentFolder.id]),
  );
  useEffect(() => {
    if (currentFolderId) {
      dispatch(driveThunks.getFolderContentThunk({ folderId: currentFolderId }));
    }

    asyncStorageService.getItem(AsyncStorageKey.PreferredDriveViewMode).then((preferredDriveViewMode) => {
      if (preferredDriveViewMode && preferredDriveViewMode !== viewMode) {
        setViewMode(preferredDriveViewMode as DriveListViewMode);
      }
    });
  }, []);

  const [sortModalOpen, setSortModalOpen] = useState(false);
  const [sortMode, setSortMode] = useState({
    type: SortType.Name,
    direction: SortDirection.Asc,
  });

  const { user, loggedIn } = useAppSelector((state) => state.auth);
  const { searchString, hiddenItemsIds } = useAppSelector((state) => state.drive);
  const { uploading: driveUploadingItems, items: driveItems } = useAppSelector(driveSelectors.driveItems);
  const { searchActive, backButtonEnabled } = useAppSelector((state) => state.ui);
  const { isLoading: contentLoading } = useAppSelector((state) => state.drive);
  const onSearchTextChanged = (value: string) => {
    dispatch(driveActions.setSearchString(value));
  };
  const isRootFolder = currentFolderId === user?.root_folder_id;
  const screenTitle = !isRootFolder ? currentFolderName : strings.screens.drive.title;
  const driveSortedItems = useMemo(
    () =>
      driveUploadingItems
        .concat(driveItems.filter((item) => !item.data.fileId).sort(drive.file.getSortFunction(sortMode)))
        .concat(driveItems.filter((item) => item.data.fileId).sort(drive.file.getSortFunction(sortMode))),
    [sortMode, driveUploadingItems, driveItems],
  );

  const onCurrentFolderActionsButtonPressed = () => {
    dispatch(
      driveActions.setFocusedItem({
        ...currentFolder,
        parentId: currentFolderParentId as number,
        updatedAt: currentFolder.updatedAt,
      }),
    );
    dispatch(uiActions.setShowItemModal(true));
  };
  const onSortButtonPressed = () => {
    setSortModalOpen(true);
  };
  const onViewModeButtonPressed = async () => {
    const newViewMode = viewMode === DriveListViewMode.List ? DriveListViewMode.Grid : DriveListViewMode.List;
    setViewMode(newViewMode);
    await asyncStorageService.saveItem(AsyncStorageKey.PreferredDriveViewMode, newViewMode);
  };
  const onBackButtonPressed = () => {
    goBackToSharedIfNeeded();
    dispatch(driveThunks.goBackThunk({ folderId: currentFolderParentId as number }));
  };

  const onSortModeChange = (mode: SortMode) => {
    setSortMode(mode);
    setTimeout(() => setSortModalOpen(false), 1);
  };

  const onCloseSortModal = () => {
    setSortModalOpen(false);
  };

  if (!loggedIn) {
    navigation.replace('SignIn');
  }

  const goBackToSharedIfNeeded = () => {
    const params = route.params as { sharedFolderId: number };
    if (params && params.sharedFolderId === currentFolder.parentId) {
      navigation.navigate('Home');
    }
  };
  useEffect(() => {
    // BackHandler
    const backAction = () => {
      if (route.name === 'Drive') {
        if (~currentFolderId && currentFolderParentId && !contentLoading) {
          goBackToSharedIfNeeded();
          dispatch(driveThunks.getFolderContentThunk({ folderId: currentFolderParentId }));
        } else {
          return false;
        }
      }

      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => {
      backHandler.remove();
    };
  }, []);

  const getItems = () => {
    return driveSortedItems.filter((si) => !hiddenItemsIds.includes(si.id));
  };

  async function handleRefresh() {
    dispatch(driveActions.resetHiddenItems());
    dispatch(driveThunks.getFolderContentThunk({ folderId: currentFolder.id, ignoreCache: true }));
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
        {/* DRIVE NAV */}
        <View style={[tailwind('flex-row items-center justify-between my-2 px-5'), isRootFolder && tailwind('hidden')]}>
          <TouchableOpacity disabled={!backButtonEnabled} onPress={onBackButtonPressed}>
            <View style={[tailwind('flex-row items-center pr-4'), !currentFolderParentId && tailwind('opacity-50')]}>
              <CaretLeft weight="bold" color={getColor('text-blue-60')} style={tailwind('-ml-2 mr-1')} size={24} />
              <Text style={[tailwind('text-blue-60 text-lg'), globalStyle.fontWeight.medium]}>
                {strings.buttons.back}
              </Text>
            </View>
          </TouchableOpacity>
          <View style={tailwind('flex-row -m-2')}>
            <View style={tailwind('items-center justify-center')}>
              <TouchableOpacity
                style={tailwind('p-2')}
                onPress={() => dispatch(uiActions.setSearchActive(!searchActive))}
              >
                <MagnifyingGlass weight="bold" color={getColor('text-blue-60')} size={24} />
              </TouchableOpacity>
            </View>
            <View style={tailwind('items-center justify-center')}>
              <TouchableOpacity style={tailwind('p-2')} onPress={onCurrentFolderActionsButtonPressed}>
                <DotsThree weight="bold" color={getColor('text-blue-60')} size={24} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <ScreenTitle text={screenTitle} showBackButton={false} />

        {(isRootFolder || searchActive) && (
          <SearchInput
            value={searchString}
            onChangeText={onSearchTextChanged}
            placeholder={strings.screens.drive.searchInThisFolder}
          />
        )}

        {/* FILE LIST ACTIONS */}
        <View style={[tailwind('flex-row justify-between items-center')]}>
          <TouchableOpacity onPress={onSortButtonPressed}>
            <View style={tailwind('px-5 py-1 flex-row items-center')}>
              <Text style={tailwind('text-base text-neutral-100 mr-1')}>
                {strings.screens.drive.sort[sortMode.type]}
              </Text>
              {sortMode.direction === SortDirection.Asc ? (
                <ArrowUp weight="bold" size={15} color={getColor('text-neutral-100')} />
              ) : (
                <ArrowDown weight="bold" size={15} color={getColor('text-neutral-100')} />
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={onViewModeButtonPressed}>
            <View style={tailwind('py-2 px-5')}>
              {viewMode === 'list' ? (
                <SquaresFour size={22} color={getColor('text-neutral-100')} />
              ) : (
                <Rows size={22} color={getColor('text-neutral-100')} />
              )}
            </View>
          </TouchableOpacity>
        </View>

        <Separator />

        <DriveList onRefresh={handleRefresh} items={getItems()} type={DriveListType.Drive} viewMode={viewMode} />
      </AppScreen>
    </>
  );
}

export default DriveScreen;
