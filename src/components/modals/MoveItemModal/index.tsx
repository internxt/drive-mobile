import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Dimensions, Platform } from 'react-native';
import strings from '../../../../assets/lang/strings';
import Separator from '../../AppSeparator';
import { tailwind, getColor } from '../../../helpers/designSystem';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { uiActions } from '../../../store/slices/ui';
import { driveActions, driveThunks } from '../../../store/slices/drive';
import {
  DriveItemDataProps,
  DriveItemStatus,
  DriveListItem,
  DriveListType,
  DriveListViewMode,
  SortDirection,
  SortType,
} from '../../../types/drive';
import DriveNavigableItem from '../../DriveNavigableItem';
import fileService from '../../../services/file';
import _ from 'lodash';
import { DriveFileData, FetchFolderContentResponse } from '@internxt/sdk/dist/drive/storage/types';
import { ArrowDown, ArrowUp, CaretLeft, X } from 'phosphor-react-native';
import ConfirmMoveItemModal from '../ConfirmMoveItemModal';
import AppText from '../../AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SortModal, { SortMode } from '../SortModal';

import BottomModal from '../BottomModal';
import CreateFolderModal from '../CreateFolderModal';
import DriveItemSkinSkeleton from '../../DriveItemSkinSkeleton';
import notificationsService from '../../../services/notifications';
import { NotificationType } from '../../../types';

/**
 * Temporal to grab colors from
 */
const colors = {
  primary: '#0066FF',
};

const INITIAL_SORT_MODE: SortMode = {
  direction: SortDirection.Asc,
  type: SortType.Name,
};
function MoveFilesModal(): JSX.Element {
  const dispatch = useAppDispatch();
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>(INITIAL_SORT_MODE);
  const [sortModalOpen, setSortModalOpen] = useState(false);
  const [createFolderModalOpen, setCreateFolderModalOpen] = useState(false);
  const [isMovingItem, setIsMovingItem] = useState(false);
  const [destinationFolderContentResponse, setDestinationFolderContentResponse] =
    useState<FetchFolderContentResponse | null>(null);
  const [originFolderContentResponse, setOriginFolderContentResponse] = useState<FetchFolderContentResponse | null>(
    null,
  );
  const safeInsets = useSafeAreaInsets();
  const modalHeight = useMemo(
    () =>
      Platform.select<string | number>({
        android: Dimensions.get('window').height - (40 + safeInsets.top),
        ios: '100%',
      }),
    [],
  );
  const { user } = useAppSelector((state) => state.auth);
  const { showMoveModal } = useAppSelector((state) => state.ui);
  const { itemToMove, folderContent } = useAppSelector((state) => state.drive);
  const currentFolderIsRootFolder = destinationFolderContentResponse?.id === user?.root_folder_id;
  const originFolderId = itemToMove?.parentId || itemToMove?.folderId || user?.root_folder_id;
  const folderItems = useMemo(
    () =>
      [...(destinationFolderContentResponse?.children || []), ...(destinationFolderContentResponse?.files || [])]
        .map<DriveListItem>((child) => ({
          status: DriveItemStatus.Idle,
          data: {
            createdAt: child.createdAt,
            updatedAt: child.updatedAt,
            name: child.name,
            id: child.id,
            size: (child as DriveFileData).size,
            type: (child as DriveFileData).type,
            fileId: (child as DriveFileData).fileId,
          },
        }))
        .sort(fileService.getSortFunction(sortMode))
        .sort((a, b) => {
          const aValue = a.data.fileId ? 1 : 0;
          const bValue = b.data.fileId ? 1 : 0;
          return aValue - bValue;
        }),
    [sortMode, destinationFolderContentResponse],
  );

  const isFolder = !!(itemToMove && !itemToMove.fileId);
  const canGoBack = currentFolderIsRootFolder ? false : true;
  const onMoveButtonPressed = () => {
    setConfirmModalOpen(true);
  };
  const moveIsDisabled = () => {
    // Current folder is origin folder
    if (originFolderContentResponse?.id === destinationFolderContentResponse?.id) return true;
    return false;
  };
  const confirmMoveItem = async () => {
    if (!itemToMove || !originFolderId || !originFolderContentResponse?.name || !destinationFolderContentResponse?.id) {
      notificationsService.show({
        text1: strings.errors.moveError,
        type: NotificationType.Error,
      });

      return;
    }

    setIsMovingItem(true);
    const moveResult = await dispatch(
      driveThunks.moveItemThunk({
        isFolder,
        origin: {
          itemId: itemToMove.fileId || itemToMove.id,
          parentId: itemToMove.parentId as number,
          name: originFolderContentResponse?.name,
          updatedAt: originFolderContentResponse.updatedAt,
          createdAt: originFolderContentResponse.createdAt,
          id: originFolderContentResponse.id,
        },
        destination: {
          folderId: destinationFolderContentResponse.id,
        },
      }),
    );
    setIsMovingItem(false);

    if (moveResult.meta.requestStatus === 'fulfilled') {
      setConfirmModalOpen(false);
      await cleanUp({ shouldRefreshFolder: true });
    }
  };
  const onFolderCreated = async () => {
    if (destinationFolderContentResponse?.id) {
      await loadDestinationFolderContent(destinationFolderContentResponse.id);
    }
    setCreateFolderModalOpen(false);
  };
  const onCancelCreateFolder = () => {
    setCreateFolderModalOpen(false);
  };
  const onCloseCreateFolder = () => {
    setCreateFolderModalOpen(false);
  };
  const cleanUp = async (options?: { shouldRefreshFolder: boolean }) => {
    if (options?.shouldRefreshFolder) {
      if (originFolderId) {
        await dispatch(driveThunks.getFolderContentThunk({ folderId: originFolderId }));
      }
    }
    await dispatch(driveActions.setItemToMove(null));
    await dispatch(uiActions.setShowMoveModal(false));
  };
  const onCancelButtonPressed = async () => {
    await cleanUp();
  };
  const getOriginFolderName = () => {
    return (
      (originFolderContentResponse?.parentId ? originFolderContentResponse?.name : strings.generic.root_folder_name) ||
      ''
    );
  };
  const getDestinationFolderName = () => {
    return (
      (currentFolderIsRootFolder ? strings.generic.root_folder_name : destinationFolderContentResponse?.name) || ''
    );
  };
  const loadDestinationFolderContent = async (folderId: number) => {
    try {
      setSortMode(INITIAL_SORT_MODE);
      const response = await fileService.getFolderContent(folderId);

      setDestinationFolderContentResponse(response);
    } catch (e) {
      notificationsService.show({ type: NotificationType.Error, text1: 'Cannot load destination folder' });
    }
  };
  const loadOriginFolderContent = async () => {
    try {
      if (originFolderId) {
        const response = await fileService.getFolderContent(originFolderId);
        setOriginFolderContentResponse(response);
      }
    } catch (e) {
      notificationsService.show({ type: NotificationType.Error, text1: 'Cannot load origin folder' });
    }
  };
  const onNavigationButtonPressed = async (item: DriveItemDataProps) => {
    if (!item.id) return;
    await loadDestinationFolderContent(item.id);
  };
  const onNavigateBack = () => {
    if (destinationFolderContentResponse?.parentId) {
      loadDestinationFolderContent(destinationFolderContentResponse.parentId);
    }
  };
  const getHeaderName = () => {
    if (currentFolderIsRootFolder) return strings.generic.root_folder_name;
    return destinationFolderContentResponse?.name;
  };
  const onCreateNewFolder = async () => {
    setCreateFolderModalOpen(true);
  };
  const onCloseMoveModal = () => {
    dispatch(uiActions.setShowMoveModal(false));
  };
  const onSortButtonPressed = () => {
    setSortModalOpen(true);
  };
  const onSortModeChange = (sortMode: SortMode) => {
    setSortMode(sortMode);
    setSortModalOpen(false);
  };
  const onCloseSortModal = () => {
    setSortModalOpen(false);
  };
  const renderListHeader = () => {
    return (
      <TouchableOpacity onPress={onSortButtonPressed} style={tailwind('px-4 mt-3')}>
        <View style={tailwind('py-1 flex-row items-center')}>
          <AppText medium style={tailwind('text-sm text-gray-60 mr-1')}>
            {strings.screens.drive.sort[sortMode.type]}
          </AppText>
          {sortMode.direction === SortDirection.Asc ? (
            <ArrowUp weight="bold" size={18} color={getColor('gray-60')} />
          ) : (
            <ArrowDown weight="bold" size={18} color={getColor('gray-60')} />
          )}
        </View>
      </TouchableOpacity>
    );
  };
  const renderListEmpty = () => {
    if (destinationFolderContentResponse) {
      return <></>;
    }
    return (
      <View style={tailwind('h-full')}>
        {_.times(20, (n) => (
          <DriveItemSkinSkeleton key={n} />
        ))}
      </View>
    );
  };

  useEffect(() => {
    if (folderContent && originFolderId && showMoveModal) {
      loadDestinationFolderContent(originFolderId);
      loadOriginFolderContent();
    }
  }, [folderContent, showMoveModal]);

  return (
    <>
      <BottomModal
        isOpen={showMoveModal}
        onClosed={onCloseMoveModal}
        style={[
          tailwind('bg-white rounded-t-2xl overflow-hidden'),
          {
            height: modalHeight,
          },
        ]}
      >
        <View style={tailwind('h-full flex flex-col')}>
          <View style={tailwind('flex flex-row justify-between')}>
            {canGoBack ? (
              <TouchableOpacity onPress={onNavigateBack} style={tailwind('py-4 px-5 flex items-center justify-center')}>
                <CaretLeft size={28} />
              </TouchableOpacity>
            ) : null}
            <View style={tailwind('px-5 flex items-center justify-center')}>
              <AppText medium style={tailwind('text-xl text-gray-80')}>
                {getHeaderName()}
              </AppText>
            </View>
            <TouchableOpacity
              style={tailwind('py-4 px-5 flex items-center justify-center')}
              onPress={onCancelButtonPressed}
            >
              <X size={28} />
            </TouchableOpacity>
          </View>

          <Separator />

          <FlatList
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={renderListHeader()}
            data={folderItems}
            ItemSeparatorComponent={() => {
              return <View style={{ height: 1, ...tailwind('bg-neutral-20') }}></View>;
            }}
            ListEmptyComponent={renderListEmpty()}
            renderItem={({ item }) => {
              return (
                <DriveNavigableItem
                  key={item.data.id}
                  disabled={!!item.data.fileId || item.data.id === itemToMove?.id}
                  type={DriveListType.Drive}
                  status={DriveItemStatus.Idle}
                  viewMode={DriveListViewMode.List}
                  onItemPressed={onNavigationButtonPressed}
                  data={item.data}
                />
              );
            }}
            keyExtractor={(folder) => folder.data.id.toString()}
          />

          <Separator style={tailwind('mb-3')} />
          <View style={[tailwind('flex justify-between flex-row px-8'), { marginBottom: safeInsets.bottom }]}>
            <TouchableOpacity activeOpacity={0.7} onPress={onCreateNewFolder}>
              <AppText medium style={[styles.text, tailwind('text-lg')]}>
                {strings.components.buttons.newFolder}
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.7} onPress={onMoveButtonPressed} disabled={moveIsDisabled()}>
              <AppText medium style={[styles.text, tailwind(`text-lg ${moveIsDisabled() ? 'text-gray-30' : ''} `)]}>
                {strings.components.buttons.moveHere}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </BottomModal>

      <ConfirmMoveItemModal
        move={{
          origin: {
            name: getOriginFolderName(),
          },
          destination: {
            name: getDestinationFolderName(),
          },
        }}
        isMovingItem={isMovingItem}
        items={[itemToMove]}
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={confirmMoveItem}
      />
      <SortModal
        isOpen={sortModalOpen}
        sortMode={sortMode}
        onSortModeChange={onSortModeChange}
        onClose={onCloseSortModal}
      />
      {destinationFolderContentResponse?.id ? (
        <CreateFolderModal
          isOpen={createFolderModalOpen}
          onCancel={onCancelCreateFolder}
          onClose={onCloseCreateFolder}
          currentFolderId={destinationFolderContentResponse?.id}
          onFolderCreated={onFolderCreated}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  text: {
    color: colors.primary,
  },
});

export default MoveFilesModal;
