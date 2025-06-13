import drive from '@internxt-mobile/services/drive';
import { DriveFileData, DriveFolderData, FetchFolderContentResponse } from '@internxt/sdk/dist/drive/storage/types';
import _ from 'lodash';
import { ArrowDown, ArrowUp, CaretLeft, X } from 'phosphor-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Dimensions, FlatList, Platform, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import strings from '../../../../assets/lang/strings';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { driveActions, driveThunks } from '../../../store/slices/drive';
import { uiActions } from '../../../store/slices/ui';
import {
  DriveItemDataProps,
  DriveItemStatus,
  DriveListItem,
  DriveListType,
  DriveListViewMode,
  SortDirection,
  SortType,
} from '../../../types/drive';
import AppSeparator from '../../AppSeparator';
import DriveNavigableItem from '../../DriveNavigableItem';

import Portal from '@burstware/react-native-portal';
import { useDrive } from '@internxt-mobile/hooks/drive';
import { useNavigation } from '@react-navigation/native';
import { SLEEP_BECAUSE_MAYBE_BACKEND_IS_NOT_RETURNING_FRESHLY_MODIFIED_OR_CREATED_ITEMS_YET } from 'src/helpers/services';
import { useTailwind } from 'tailwind-rn';
import useGetColor from '../../../hooks/useColor';
import notificationsService from '../../../services/NotificationsService';
import { NotificationType } from '../../../types';
import { RootScreenNavigationProp } from '../../../types/navigation';
import AppText from '../../AppText';
import DriveItemSkinSkeleton from '../../DriveItemSkinSkeleton';
import BottomModal from '../BottomModal';
import ConfirmMoveItemModal from '../ConfirmMoveItemModal';
import CreateFolderModal from '../CreateFolderModal';
import SortModal, { SortMode } from '../SortModal';

const INITIAL_SORT_MODE: SortMode = {
  direction: SortDirection.Asc,
  type: SortType.Name,
};

function MoveItemsModal(): JSX.Element {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  const driveCtx = useDrive();
  const navigation = useNavigation<RootScreenNavigationProp<'TabExplorer'>>();
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
  const currentFolderIsRootFolder = destinationFolderContentResponse?.uuid === user?.rootFolderId;
  const originFolderId = itemToMove?.parentUuid ?? itemToMove?.folderUuid ?? user?.rootFolderUuid;

  const folderItems = useMemo(
    () =>
      [...(destinationFolderContentResponse?.children ?? []), ...(destinationFolderContentResponse?.files ?? [])]
        .map<DriveListItem>((child) => ({
          id: child.id.toString(),
          status: DriveItemStatus.Idle,
          data: {
            bucket: child.bucket,
            isFolder: 'fileId' in child ? false : true,
            thumbnails: (child as DriveFileData).thumbnails,
            currentThumbnail: null,
            createdAt: child.createdAt,
            updatedAt: child.updatedAt,
            name: child?.plainName ?? child.name,
            id: child.id,
            uuid: child.uuid,
            size: (child as DriveFileData).size,
            type: (child as DriveFileData).type,
            fileId: (child as DriveFileData).fileId,
            folderUuid: (child as DriveFileData)?.folderUuid,
            parentUuid: (child as DriveFolderData)?.parentUuid,
          },
        }))
        .sort(drive.file.getSortFunction(sortMode))
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
    if (originFolderContentResponse?.uuid === destinationFolderContentResponse?.uuid) return true;
    return false;
  };
  const confirmMoveItem = async () => {
    if (!originFolderContentResponse || !itemToMove || !originFolderId || !destinationFolderContentResponse?.uuid) {
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
          itemId: itemToMove.fileId ?? itemToMove.id,
          parentUuid: itemToMove.parentUuid ?? '',
          name: originFolderContentResponse.plainName ?? '',
          updatedAt: originFolderContentResponse.updatedAt,
          createdAt: originFolderContentResponse.createdAt,
          uuid: itemToMove.uuid as string,
        },
        destinationUuid: destinationFolderContentResponse.uuid,
        itemMovedAction: () => {
          navigation.push('TabExplorer', { screen: 'Drive' });
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
    if (destinationFolderContentResponse?.uuid) {
      await loadDestinationFolderContent(destinationFolderContentResponse.uuid);
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
      if (originFolderContentResponse?.id) {
        await SLEEP_BECAUSE_MAYBE_BACKEND_IS_NOT_RETURNING_FRESHLY_MODIFIED_OR_CREATED_ITEMS_YET(500);
        await driveCtx.loadFolderContent(originFolderContentResponse.uuid, {
          resetPagination: true,
          pullFrom: ['network'],
        });
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
      (originFolderContentResponse?.parentId
        ? originFolderContentResponse?.plainName
        : strings.generic.root_folder_name) ?? ''
    );
  };
  const getDestinationFolderName = () => {
    return (
      (currentFolderIsRootFolder ? strings.generic.root_folder_name : destinationFolderContentResponse?.plainName) ?? ''
    );
  };
  const loadDestinationFolderContent = async (folderId?: string) => {
    try {
      if (!folderId) throw new Error('Missing folder uuid');
      setSortMode(INITIAL_SORT_MODE);
      const response = await drive.folder.getFolderContentByUuid(folderId);

      setDestinationFolderContentResponse({ ...response, name: (response as any)?.plainName } as any);
    } catch (e) {
      notificationsService.show({ type: NotificationType.Error, text1: 'Cannot load destination folder' });
    }
  };
  const loadOriginFolderContent = async () => {
    try {
      if (originFolderId) {
        const response = await drive.folder.getFolderContentByUuid(originFolderId);

        setOriginFolderContentResponse(response);
      }
    } catch (e) {
      notificationsService.show({ type: NotificationType.Error, text1: 'Cannot load origin folder' });
    }
  };
  const onNavigationButtonPressed = async (item: DriveItemDataProps) => {
    if (!item.uuid) return;
    await loadDestinationFolderContent(item?.uuid);
  };
  const onNavigateBack = () => {
    if (destinationFolderContentResponse?.parentUuid) {
      loadDestinationFolderContent(destinationFolderContentResponse.parentUuid);
    }
  };
  const getHeaderName = () => {
    if (currentFolderIsRootFolder) return strings.generic.root_folder_name;
    return destinationFolderContentResponse?.plainName;
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
          <AppText medium style={[tailwind('text-sm mr-1'), { color: getColor('text-gray-60') }]}>
            {strings.screens.drive.sort[sortMode.type]}
          </AppText>
          {sortMode.direction === SortDirection.Asc ? (
            <ArrowUp weight="bold" size={18} color={getColor('text-gray-60')} />
          ) : (
            <ArrowDown weight="bold" size={18} color={getColor('text-gray-60')} />
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
      <View style={[tailwind('h-full'), { backgroundColor: getColor('bg-surface') }]}>
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
    <Portal>
      <BottomModal
        isOpen={showMoveModal}
        onClosed={onCloseMoveModal}
        style={[
          tailwind('rounded-t-2xl overflow-hidden'),
          {
            height: modalHeight,
            backgroundColor: getColor('bg-surface'),
          },
        ]}
      >
        <View style={[tailwind('h-full flex flex-col'), { backgroundColor: getColor('bg-surface') }]}>
          <View style={tailwind('flex flex-row justify-between')}>
            {canGoBack ? (
              <TouchableOpacity onPress={onNavigateBack} style={tailwind('py-4 px-5 flex items-center justify-center')}>
                <CaretLeft size={28} color={getColor('text-gray-100')} />
              </TouchableOpacity>
            ) : null}
            <View style={tailwind('px-5 flex items-center justify-center')}>
              <AppText medium style={[tailwind('text-xl'), { color: getColor('text-gray-80') }]}>
                {getHeaderName()}
              </AppText>
            </View>
            <TouchableOpacity
              style={tailwind('py-4 px-5 flex items-center justify-center')}
              onPress={onCancelButtonPressed}
            >
              <X size={28} color={getColor('text-gray-100')} />
            </TouchableOpacity>
          </View>

          <AppSeparator />

          <FlatList
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={renderListHeader()}
            data={folderItems}
            ItemSeparatorComponent={() => {
              return (
                <View
                  style={{
                    height: 1,
                    backgroundColor: getColor('bg-gray-1'),
                    marginHorizontal: 16,
                  }}
                />
              );
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
            style={{ backgroundColor: getColor('bg-surface') }}
          />

          <AppSeparator style={tailwind('mb-3')} />

          <View
            style={[
              tailwind('flex justify-between flex-row px-8'),
              {
                marginBottom: safeInsets.bottom,
                backgroundColor: getColor('bg-surface'),
              },
            ]}
          >
            <TouchableOpacity activeOpacity={0.7} onPress={onCreateNewFolder}>
              <AppText medium style={[tailwind('text-lg'), { color: getColor('text-primary') }]}>
                {strings.buttons.newFolder}
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.7} onPress={onMoveButtonPressed} disabled={moveIsDisabled()}>
              <AppText
                medium
                style={[
                  tailwind('text-lg'),
                  {
                    color: moveIsDisabled() ? getColor('text-gray-30') : getColor('text-primary'),
                  },
                ]}
              >
                {strings.buttons.moveHere}
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
          currentFolderUuid={destinationFolderContentResponse?.uuid}
          onFolderCreated={onFolderCreated}
        />
      ) : null}
    </Portal>
  );
}

export default MoveItemsModal;
