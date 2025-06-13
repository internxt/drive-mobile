import { useUseCase } from '@internxt-mobile/hooks/common';
import { useDrive } from '@internxt-mobile/hooks/drive';
import analytics, { AnalyticsEventKey } from '@internxt-mobile/services/AnalyticsService';
import errorService from '@internxt-mobile/services/ErrorService';
import { DriveListItem, DriveListViewMode } from '@internxt-mobile/types/drive';
import { RootStackScreenProps } from '@internxt-mobile/types/navigation';
import * as driveUseCases from '@internxt-mobile/useCases/drive';
import strings from 'assets/lang/strings';
import { times } from 'lodash';
import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import AppScreen from 'src/components/AppScreen';
import { DriveList } from 'src/components/drive/lists/DriveList';
import DriveItemSkinSkeleton from 'src/components/DriveItemSkinSkeleton';
import { ConfirmModal } from 'src/components/modals/ConfirmModal/ConfirmModal';
import { SLEEP_BECAUSE_MAYBE_BACKEND_IS_NOT_RETURNING_FRESHLY_MODIFIED_OR_CREATED_ITEMS_YET } from 'src/helpers/services';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { driveActions } from 'src/store/slices/drive';
import { useTailwind } from 'tailwind-rn';
import { TrashOptionsModal } from './modals/TrashOptionsModal';
import { TrashEmptyState } from './TrashEmptyState';
import { TrashScreenHeader } from './TrashScreenHeader';
export const TrashScreen: React.FC<RootStackScreenProps<'Trash'>> = (props) => {
  const driveCtx = useDrive();
  const { executeUseCase: getDriveTrashItems } = useUseCase(driveUseCases.getDriveTrashItems, { lazy: true });
  const [optionsModalOpen, setOptionsModalOpen] = useState(false);
  const [driveTrashItems, setDriveTrashItems] = useState<DriveListItem[]>([]);
  const [hiddenItems, setHiddenItems] = useState<DriveListItem[]>([]);
  const [emptyTrashDisabled, setEmptyTrashDisabled] = useState(true);
  const [confirmDeleteModalOpen, setConfirmDeleteModalOpen] = useState(false);
  const [confirmClearTrashModalOpen, setConfirmClearTrashModalOpen] = useState(false);
  const [shouldGetMoreDriveTrashFiles, setShouldGetMoreDriveTrashFiles] = useState(true);
  const [shouldGetMoreDriveTrashFolders, setShouldGetMoreDriveTrashFolders] = useState(true);
  const [driveTrashPage, setDriveTrashPage] = useState(1);
  const [gettingDriveTrashItems, setGettingDriveTrashItems] = useState(false);
  /** REDUX USAGE STARTS HERE, used for compatibility, should be removed */
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  /** REDUX USAGE ENDS HERE */
  const screenIsFocused = useRef(false);
  const [selectedDriveItem, setSelectedDriveItem] = useState<DriveListItem | undefined>(undefined);
  const tailwind = useTailwind();

  useEffect(() => {
    const unsubscribe = driveUseCases.onDriveItemTrashed(handleRefreshByEvent);
    props.navigation.addListener('blur', handleBlurScreen);
    props.navigation.addListener('focus', handleFocusScreen);
    return () => {
      props.navigation.removeListener('blur', handleBlurScreen);
      props.navigation.removeListener('focus', handleFocusScreen);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!driveTrashItems.length) {
      setEmptyTrashDisabled(true);
    } else {
      setEmptyTrashDisabled(false);
    }
  }, [driveTrashItems]);

  const handleRefreshByEvent = () => {
    if (!screenIsFocused.current) {
      handleRefresh();
    }
  };
  const handleBlurScreen = () => {
    setHiddenItems([]);
    screenIsFocused.current = false;
  };

  const handleFocusScreen = () => {
    screenIsFocused.current = true;
    setGettingDriveTrashItems(true);
    handleRefresh();
  };
  const handleRefresh = async () => {
    try {
      setGettingDriveTrashItems(true);
      setShouldGetMoreDriveTrashFiles(true);
      setShouldGetMoreDriveTrashFolders(true);
      const result = await getDriveTrashItems({ page: 1, shouldGetFiles: true, shouldGetFolders: true });
      if (!result?.data?.items.length) return;

      if (!result.data.hasMoreFiles) {
        setShouldGetMoreDriveTrashFiles(false);
      }

      if (!result.data.hasMoreFolders) {
        setShouldGetMoreDriveTrashFolders(false);
      }
      setDriveTrashItems(result.data.items);
    } catch (error) {
      errorService.reportError(error);
    } finally {
      setGettingDriveTrashItems(false);
    }
    setHiddenItems([]);
  };
  const handleBackButtonPress = () => {
    props.navigation.goBack();
  };

  const handleClearTrash = async () => {
    await driveUseCases.clearTrash();
    setConfirmClearTrashModalOpen(false);

    setHiddenItems(driveTrashItems as DriveListItem[]);
    setEmptyTrashDisabled(true);
    analytics.track(AnalyticsEventKey.TrashEmptied, {
      number_of_items: driveTrashItems?.length,
    });
  };

  const handleRestoreDriveItem = async (item: DriveListItem) => {
    if (!user) return;
    setHiddenItems(hiddenItems.concat([item]));
    setSelectedDriveItem(undefined);
    setOptionsModalOpen(false);

    const destinationFolderId =
      (item.data.isFolder ? item.data.parentUuid : item.data.folderUuid) ?? user?.rootFolderId;

    const { success } = await driveUseCases.restoreDriveItems([
      {
        fileId: item.data.isFolder ? undefined : item.data.uuid,
        folderId: item.data.isFolder ? item.data.uuid : undefined,
        destinationFolderId,
      },
    ]);

    if (!success) {
      dispatch(driveActions.hideItemsById([item.id]));
      setHiddenItems(hiddenItems.filter((hiddenItem) => hiddenItem.id === item.id));
    } else {
      await SLEEP_BECAUSE_MAYBE_BACKEND_IS_NOT_RETURNING_FRESHLY_MODIFIED_OR_CREATED_ITEMS_YET(500);
      driveCtx.loadFolderContent(destinationFolderId, { pullFrom: ['network'], resetPagination: true });
    }
  };

  const handleDeleteDriveItem = async (item: DriveListItem) => {
    await driveUseCases.deleteDriveItemsPermanently([item]);
    setHiddenItems(hiddenItems.concat([item]));
    setSelectedDriveItem(undefined);
    setConfirmDeleteModalOpen(false);
    setOptionsModalOpen(false);
  };

  const handleNextDriveTrashPage = async () => {
    try {
      setDriveTrashPage(driveTrashPage + 1);
      const result = await getDriveTrashItems({
        page: driveTrashPage + 1,
        shouldGetFiles: shouldGetMoreDriveTrashFiles,
        shouldGetFolders: shouldGetMoreDriveTrashFolders,
      });

      if (!result?.data?.hasMoreFiles) {
        setShouldGetMoreDriveTrashFiles(false);
      }

      if (!result?.data?.hasMoreFolders) {
        setShouldGetMoreDriveTrashFolders(false);
      }

      if (!result?.data?.items.length) return;

      setDriveTrashItems(driveTrashItems.concat(result.data.items));
    } catch (error) {
      errorService.reportError(error);
    }
  };

  const handleDriveItemPress = (item: DriveListItem) => {
    setSelectedDriveItem(item);
    setOptionsModalOpen(true);
  };

  const getItems = () => {
    return driveTrashItems?.filter((item) => !hiddenItems.map((hi) => hi.id).includes(item.id));
  };

  return (
    <>
      <AppScreen safeAreaTop style={tailwind('flex-1')}>
        <View style={tailwind('border-b border-gray-10 px-2')}>
          <TrashScreenHeader
            emptyTrashIsDisabled={emptyTrashDisabled}
            onBackButtonPress={handleBackButtonPress}
            onTrashButtonPress={() => setConfirmClearTrashModalOpen(true)}
          />
        </View>
        <View style={tailwind('flex-1')}>
          {gettingDriveTrashItems && !getItems().length ? (
            <View style={tailwind('flex-1')}>
              {times(20).map((_, index) => {
                return <DriveItemSkinSkeleton key={index} viewMode={DriveListViewMode.List} />;
              })}
            </View>
          ) : (
            <DriveList
              onEndReached={handleNextDriveTrashPage}
              contentContainerStyle={tailwind('pt-2')}
              items={getItems()}
              onRefresh={handleRefresh}
              viewMode={DriveListViewMode.List}
              onDriveItemPress={handleDriveItemPress}
              onDriveItemActionsPress={handleDriveItemPress}
              renderEmpty={() => <TrashEmptyState />}
            />
          )}
        </View>
      </AppScreen>

      {/* Confirm delete item */}
      <ConfirmModal
        isOpen={confirmDeleteModalOpen}
        onClose={() => setConfirmDeleteModalOpen(false)}
        title={strings.modals.deleteItemPermanently.title}
        message={strings.modals.deleteItemPermanently.message}
        confirmLabel={strings.buttons.delete}
        onConfirm={() => handleDeleteDriveItem(selectedDriveItem as DriveListItem)}
        onCancel={() => setConfirmDeleteModalOpen(false)}
        type="confirm-danger"
      />
      {/* Confirm clear trash */}
      <ConfirmModal
        isOpen={confirmClearTrashModalOpen}
        onClose={() => setConfirmClearTrashModalOpen(false)}
        title={strings.modals.clearTrash.title}
        message={strings.modals.clearTrash.message}
        confirmLabel={strings.buttons.delete}
        onConfirm={handleClearTrash}
        onCancel={() => setConfirmClearTrashModalOpen(false)}
        type="confirm-danger"
      />
      <TrashOptionsModal
        isOpen={optionsModalOpen}
        onClose={() => setOptionsModalOpen(false)}
        item={selectedDriveItem}
        onRestoreDriveItem={handleRestoreDriveItem}
        onDeleteDriveItem={() => setConfirmDeleteModalOpen(true)}
      />
    </>
  );
};
