import React, { useEffect, useMemo, useState } from 'react';
import { Text, View, BackHandler, TouchableOpacity } from 'react-native';

import DriveList from '../../components/DriveList';
import analytics from '../../services/AnalyticsService';
import storageService from '../../services/StorageService';
import strings from '../../../assets/lang/strings';
import { getColor, tailwind } from '../../helpers/designSystem';
import SearchInput from '../../components/SearchInput';
import globalStyle from '../../styles';
import ScreenTitle from '../../components/AppScreenTitle';
import Separator from '../../components/AppSeparator';
import { DevicePlatform } from '../../types';
import { authActions } from '../../store/slices/auth';
import { driveActions, driveSelectors, driveThunks } from '../../store/slices/drive';
import { uiActions } from '../../store/slices/ui';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useRoute } from '@react-navigation/native';
import AppScreen from '../../components/AppScreen';
import { ArrowDown, ArrowUp, CaretLeft, DotsThree, MagnifyingGlass, Rows, SquaresFour } from 'phosphor-react-native';
import asyncStorage from '../../services/AsyncStorageService';
import { DriveListType, SortDirection, SortType } from '../../types/drive';
import SortModal, { SortMode } from '../../components/modals/SortModal';
import fileService from '../../services/DriveFileService';
import { TabExplorerScreenProps } from '../../types/navigation';

function DriveScreen({ navigation }: TabExplorerScreenProps<'Drive'>): JSX.Element {
  const route = useRoute();
  const dispatch = useAppDispatch();
  const [sortModalOpen, setSortModalOpen] = useState(false);
  const [sortMode, setSortMode] = useState({
    type: SortType.Name,
    direction: SortDirection.Asc,
  });

  const { user, loggedIn } = useAppSelector((state) => state.auth);
  const { searchString } = useAppSelector((state) => state.drive);
  const currentFolder = useAppSelector(driveSelectors.navigationStackPeek);
  const { id: currentFolderId, name: currentFolderName, parentId: currentFolderParentId } = currentFolder;
  const { uploading: driveUploadingItems, items: driveItems } = useAppSelector(driveSelectors.driveItems);
  const { searchActive, backButtonEnabled, fileViewMode } = useAppSelector((state) => state.ui);
  const onSearchTextChanged = (value: string) => {
    dispatch(driveActions.setSearchString(value));
  };
  const isRootFolder = currentFolderId === user?.root_folder_id;
  const screenTitle = !isRootFolder ? currentFolderName : strings.screens.drive.title;
  const driveSortedItems = useMemo(
    () => [
      ...driveUploadingItems,
      ...driveItems.sort(fileService.getSortFunction(sortMode)).sort((a, b) => {
        const aValue = a.data.fileId ? 1 : 0;
        const bValue = b.data.fileId ? 1 : 0;
        return aValue - bValue;
      }),
    ],
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
  const onViewModeButtonPressed = () => {
    dispatch(uiActions.switchFileViewMode());
  };
  const onBackButtonPressed = () => {
    dispatch(driveThunks.goBackThunk({ folderId: currentFolderParentId as number }));
  };

  const onSortModeChange = (mode: SortMode) => {
    setSortMode(mode);
    setSortModalOpen(false);
  };

  const onCloseSortModal = () => {
    setSortModalOpen(false);
  };

  if (!loggedIn) {
    navigation.replace('SignIn');
  }

  useEffect(() => {
    asyncStorage
      .getUser()
      .then((userData) => {
        storageService
          .loadValues()
          .then((res) => {
            const currentPlan = {
              usage: parseInt(res.usage.toFixed(1)),
              limit: parseInt(res.limit.toFixed(1)),
              percentage: parseInt((res.usage / res.limit).toFixed(1)),
            };

            dispatch(authActions.setUserStorage(currentPlan));
            if (res) {
              analytics
                .identify(userData.uuid, {
                  userId: userData.uuid,
                  email: userData.email,
                  platform: DevicePlatform.Mobile,
                  storage_used: currentPlan.usage,
                  storage_limit: currentPlan.limit,
                  storage_usage: currentPlan.percentage,
                })
                .catch(() => undefined);
            }
          })
          .catch(() => undefined);
      })
      .catch(() => undefined);

    // BackHandler
    const backAction = () => {
      if (route.name === 'Drive') {
        if (~currentFolderId && currentFolderParentId) {
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

  return (
    <AppScreen safeAreaTop style={tailwind('flex-1')}>
      {/* DRIVE NAV */}
      <View style={[tailwind('flex-row items-center justify-between my-2 px-5'), isRootFolder && tailwind('hidden')]}>
        <TouchableOpacity disabled={!backButtonEnabled} onPress={onBackButtonPressed}>
          <View style={[tailwind('flex-row items-center pr-4'), !currentFolderParentId && tailwind('opacity-50')]}>
            <CaretLeft weight="bold" color={getColor('blue-60')} style={tailwind('-ml-2 mr-1')} size={24} />
            <Text style={[tailwind('text-blue-60 text-lg'), globalStyle.fontWeight.medium]}>
              {strings.components.buttons.back}
            </Text>
          </View>
        </TouchableOpacity>
        <View style={tailwind('flex-row -m-2')}>
          <View style={tailwind('items-center justify-center')}>
            <TouchableOpacity
              style={tailwind('p-2')}
              onPress={() => dispatch(uiActions.setSearchActive(!searchActive))}
            >
              <MagnifyingGlass weight="bold" color={getColor('blue-60')} size={24} />
            </TouchableOpacity>
          </View>
          <View style={tailwind('items-center justify-center')}>
            <TouchableOpacity style={tailwind('p-2')} onPress={onCurrentFolderActionsButtonPressed}>
              <DotsThree weight="bold" color={getColor('blue-60')} size={24} />
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
            <Text style={tailwind('text-base text-neutral-100 mr-1')}>{strings.screens.drive.sort[sortMode.type]}</Text>
            {sortMode.direction === SortDirection.Asc ? (
              <ArrowUp weight="bold" size={15} color={getColor('neutral-100')} />
            ) : (
              <ArrowDown weight="bold" size={15} color={getColor('neutral-100')} />
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={onViewModeButtonPressed}>
          <View style={tailwind('py-2 px-5')}>
            {fileViewMode === 'list' ? (
              <SquaresFour size={22} color={getColor('neutral-100')} />
            ) : (
              <Rows size={22} color={getColor('neutral-100')} />
            )}
          </View>
        </TouchableOpacity>
      </View>

      <Separator />

      <DriveList items={driveSortedItems} type={DriveListType.Drive} viewMode={fileViewMode} />
      <SortModal
        isOpen={sortModalOpen}
        sortMode={sortMode}
        onSortModeChange={onSortModeChange}
        onClose={onCloseSortModal}
      />
    </AppScreen>
  );
}

export default DriveScreen;
