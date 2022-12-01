import { useUseCase } from '@internxt-mobile/hooks/common';
import { DriveListItem, DriveListViewMode } from '@internxt-mobile/types/drive';
import { RootStackScreenProps, SettingsScreenProps } from '@internxt-mobile/types/navigation';
import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import AppScreen from 'src/components/AppScreen';
import { useTailwind } from 'tailwind-rn';
import { TrashEmptyState } from './TrashEmptyState';
import { TrashScreenHeader } from './TrashScreenHeader';
import * as driveUseCases from '@internxt-mobile/useCases/drive';
import { DriveList } from 'src/components/drive/lists/DriveList';
import { TrashOptionsModal } from './modals/TrashOptionsModal';
import { ConfirmModal } from 'src/components/modals/ConfirmModal/ConfirmModal';
import strings from 'assets/lang/strings';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { driveActions } from 'src/store/slices/drive';
import analytics, { AnalyticsEventKey } from '@internxt-mobile/services/AnalyticsService';
import { useDrive } from '@internxt-mobile/hooks/drive';
export const TrashScreen: React.FC<RootStackScreenProps<'Trash'>> = (props) => {
  const driveCtx = useDrive();
  const { data: result, executeUseCase: getTrashItems } = useUseCase(driveUseCases.getTrashItems);
  const [optionsModalOpen, setOptionsModalOpen] = useState(false);
  const [hiddenItems, setHiddenItems] = useState<DriveListItem[]>([]);
  const [emptyTrashDisabled, setEmptyTrashDisabled] = useState(true);
  const [confirmDeleteModalOpen, setConfirmDeleteModalOpen] = useState(false);
  const [confirmClearTrashModalOpen, setConfirmClearTrashModalOpen] = useState(false);
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
    if (!result?.data?.length) {
      setEmptyTrashDisabled(true);
    } else {
      setEmptyTrashDisabled(false);
    }
  }, [result?.data]);

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
    handleRefresh();
  };
  const handleRefresh = async () => {
    setHiddenItems([]);
    await getTrashItems();
  };
  const handleBackButtonPress = () => {
    props.navigation.goBack();
  };

  const handleClearTrash = async () => {
    await driveUseCases.clearTrash();
    setConfirmClearTrashModalOpen(false);

    setHiddenItems(result?.data as DriveListItem[]);
    setEmptyTrashDisabled(true);
    analytics.track(AnalyticsEventKey.TrashEmptied, {
      number_of_items: result?.data?.length,
    });
  };

  const handleRestoreDriveItem = async (item: DriveListItem) => {
    if (!user) return;
    setHiddenItems(hiddenItems.concat([item]));
    setSelectedDriveItem(undefined);
    setOptionsModalOpen(false);
    const { success } = await driveUseCases.restoreDriveItems([
      {
        fileId: item.data.fileId,
        folderId: item.data.folderId,
        destinationFolderId: item.data.parentId || user?.root_folder_id,
      },
    ]);

    if (!success) {
      dispatch(driveActions.hideItemsById([item.id]));
      setHiddenItems(hiddenItems.filter((hiddenItem) => hiddenItem.id === item.id));
    } else {
      setTimeout(() => {
        driveCtx.loadFolderContent(item.data.parentId || user?.root_folder_id, { pullFrom: ['network'] });
      }, 1000);
    }
  };

  const handleDeleteDriveItem = async (item: DriveListItem) => {
    await driveUseCases.deleteDriveItemsPermanently([item]);
    setHiddenItems(hiddenItems.concat([item]));
    setSelectedDriveItem(undefined);
    setConfirmDeleteModalOpen(false);
    setOptionsModalOpen(false);
  };

  const handleDriveItemPress = (item: DriveListItem) => {
    setSelectedDriveItem(item);
    setOptionsModalOpen(true);
  };

  const getItems = () => {
    return result?.data?.filter((item) => !hiddenItems.map((hi) => hi.id).includes(item.id));
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
          <DriveList
            contentContainerStyle={tailwind('pt-2')}
            items={getItems()}
            onRefresh={handleRefresh}
            viewMode={DriveListViewMode.List}
            onDriveItemPress={handleDriveItemPress}
            onDriveItemActionsPress={handleDriveItemPress}
            renderEmpty={() => <TrashEmptyState />}
          />
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
