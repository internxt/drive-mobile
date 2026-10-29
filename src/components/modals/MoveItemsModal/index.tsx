import drive from '@internxt-mobile/services/drive';
import { DriveFileData } from '@internxt-mobile/types/drive/file';
import { DriveFolderData, FetchFolderContentResponse } from '@internxt-mobile/types/drive/folder';
import _ from 'lodash';
import { ArrowDown, ArrowUp, CaretLeft, X } from 'phosphor-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Dimensions, FlatList, Platform, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import strings from '../../../../assets/lang/strings';
import * as driveUseCases from '@internxt-mobile/useCases/drive';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { driveActions } from '../../../store/slices/drive';
import { uiActions } from '../../../store/slices/ui';
import { DriveItemData, DriveItemStatus, DriveListItem } from '../../../types/drive/item';
import { DriveListType, DriveListViewMode, SortDirection, SortMode, SortType } from '../../../types/drive/ui';
import AppSeparator from '../../AppSeparator';
import DriveNavigableItem from '../../DriveNavigableItem';

import Portal from '@burstware/react-native-portal';
import { useDrive } from '@internxt-mobile/hooks/drive';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from 'tailwind-rn';
import { checkIsFile, checkIsFolder } from '../../../helpers';
import useGetColor from '../../../hooks/useColor';
import errorService from '../../../services/ErrorService';
import notificationsService from '../../../services/NotificationsService';
import { NotificationType } from '../../../types';
import { RootScreenNavigationProp } from '../../../types/navigation';
import AppText from '../../AppText';
import DriveItemSkinSkeleton from '../../DriveItemSkinSkeleton';
import BottomModal from '../BottomModal';
import ConfirmMoveItemModal from '../ConfirmMoveItemModal';
import CreateFolderModal from '../CreateFolderModal';
import NameCollisionModal from '../NameCollisionModal';
import SortModal from '../SortModal';

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
  const [moveCollisions, setMoveCollisions] = useState<driveUseCases.MoveCollision[]>([]);
  const [collisionActionsByUuid, setCollisionActionsByUuid] = useState(
    new Map<string, driveUseCases.MoveCollisionAction>(),
  );
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
  const { itemsToMove, folderContent } = useAppSelector((state) => state.drive);
  const currentFolderIsRootFolder = destinationFolderContentResponse?.uuid === user?.rootFolderId;
  const firstItemToMove = itemsToMove.at(0);
  const originFolderId = firstItemToMove?.parentUuid ?? firstItemToMove?.folderUuid ?? user?.rootFolderUuid;
  const uuidsToMove = useMemo(() => new Set(itemsToMove.map((item) => item.uuid)), [itemsToMove]);
  const movableItems = useMemo<driveUseCases.MovableItem[]>(
    () =>
      itemsToMove.map((item) => ({ uuid: item.uuid, name: item.name, type: item.type, isFolder: checkIsFolder(item) })),
    [itemsToMove],
  );
  const pendingCollisions = useMemo(
    () => moveCollisions.filter((collision) => !collisionActionsByUuid.has(collision.item.uuid)),
    [moveCollisions, collisionActionsByUuid],
  );
  const currentCollision = pendingCollisions.at(0);

  const folderItems = useMemo(
    () =>
      [...(destinationFolderContentResponse?.children ?? []), ...(destinationFolderContentResponse?.files ?? [])]
        .map<DriveListItem>((child) => ({
          id: child.uuid,
          status: DriveItemStatus.Idle,
          data: {
            bucket: child.bucket,
            isFolder: checkIsFolder(child as any),
            thumbnails: (child as DriveFileData).thumbnails,
            currentThumbnail: null,
            createdAt: child.createdAt,
            updatedAt: child.updatedAt,
            name: child.plainName,
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

  const canGoBack = currentFolderIsRootFolder ? false : true;
  const onMoveButtonPressed = () => {
    setConfirmModalOpen(true);
  };
  const moveIsDisabled = () => {
    // Current folder is origin folder
    if (originFolderContentResponse?.uuid === destinationFolderContentResponse?.uuid) return true;
    return false;
  };

  const updateFolderTrees = (
    movedUuids: string[],
    finalItemsToMove: driveUseCases.MovableItem[],
    originFolderUuid: string,
    destinationFolderUuid: string,
  ) => {
    const movedUuidSet = new Set(movedUuids);
    const newNameByUuid = new Map(finalItemsToMove.map((item) => [item.uuid, item.newName]));
    const isDestinationFolderLoaded = !!driveCtx.driveFoldersTree[destinationFolderUuid];
    itemsToMove
      .filter((item) => movedUuidSet.has(item.uuid))
      .forEach((movedItem) => {
        driveCtx.removeItemFromTree(originFolderUuid, movedItem.uuid);
        if (!isDestinationFolderLoaded) {
          return;
        }
        const isMovedItemFolder = checkIsFolder(movedItem);
        const destinationName = newNameByUuid.get(movedItem.uuid) ?? movedItem.name;
        const itemForDestination = isMovedItemFolder
          ? {
              ...movedItem,
              name: destinationName,
              plainName: destinationName,
              parentUuid: destinationFolderUuid,
              isFolder: isMovedItemFolder,
            }
          : {
              ...movedItem,
              name: destinationName,
              plainName: destinationName,
              folderUuid: destinationFolderUuid,
              isFolder: isMovedItemFolder,
            };
        // Added any because the items to move are not typed as drive items
        driveCtx.addItemToTree(destinationFolderUuid, itemForDestination as any, isMovedItemFolder);
      });
  };

  const showMoveError = () => {
    notificationsService.show({ text1: strings.errors.moveError, type: NotificationType.Error });
  };

  const executeMoveItems = async (finalItemsToMove: driveUseCases.MovableItem[]) => {
    if (
      !originFolderContentResponse ||
      itemsToMove.length === 0 ||
      !originFolderId ||
      !destinationFolderContentResponse?.uuid
    ) {
      setIsMovingItem(false);
      showMoveError();
      return;
    }

    if (!driveCtx.focusedFolder) {
      setIsMovingItem(false);
      showMoveError();
      return;
    }

    setIsMovingItem(true);
    const destinationFolderUuid = destinationFolderContentResponse.uuid;
    const { movedUuids } = await driveUseCases.moveDriveItems({
      items: finalItemsToMove,
      originFolderUuid: originFolderId,
      destinationFolderUuid,
      onViewFolderPress: () => {
        navigation.push('TabExplorer', { screen: 'Drive' });
      },
    });
    setIsMovingItem(false);

    updateFolderTrees(movedUuids, finalItemsToMove, originFolderId, destinationFolderUuid);
    if (movedUuids.length > 0 || finalItemsToMove.length === 0) {
      setConfirmModalOpen(false);
      await cleanUp({ shouldRefreshFolder: false });
    }
  };

  const confirmMoveItem = async () => {
    const destinationFolderUuid = destinationFolderContentResponse?.uuid;
    if (!destinationFolderUuid) {
      showMoveError();
      return;
    }

    setIsMovingItem(true);
    let collisions: driveUseCases.MoveCollision[];
    try {
      collisions = await driveUseCases.findMoveCollisions(movableItems, destinationFolderUuid);
    } catch (error) {
      errorService.reportError(error);
      setIsMovingItem(false);
      showMoveError();
      return;
    }

    if (collisions.length === 0) {
      await executeMoveItems(movableItems);
      return;
    }

    setIsMovingItem(false);
    setConfirmModalOpen(false);
    setCollisionActionsByUuid(new Map());
    setMoveCollisions(collisions);
  };

  const handleNameCollisionAction = async (action: driveUseCases.MoveCollisionAction, shouldApplyToAll: boolean) => {
    const actionsByUuid = driveUseCases.applyCollisionAction({
      pendingCollisions,
      actionsByUuid: collisionActionsByUuid,
      action,
      shouldApplyToAll,
    });
    setCollisionActionsByUuid(actionsByUuid);
    const hasPendingCollisions = moveCollisions.some((collision) => !actionsByUuid.has(collision.item.uuid));
    if (hasPendingCollisions) {
      return;
    }

    const destinationFolderUuid = destinationFolderContentResponse?.uuid;
    if (!destinationFolderUuid) {
      showMoveError();
      return;
    }

    setConfirmModalOpen(true);
    setIsMovingItem(true);
    let finalItemsToMove: driveUseCases.MovableItem[];
    try {
      const resolvedCollisions = await driveUseCases.resolveMoveCollisions({
        items: movableItems,
        collisions: moveCollisions,
        actionsByUuid,
        destinationFolderUuid,
      });
      finalItemsToMove = resolvedCollisions.finalItemsToMove;
      resolvedCollisions.trashedDestinationItemUuids.forEach((trashedItemUuid) =>
        driveCtx.removeItemFromTree(destinationFolderUuid, trashedItemUuid),
      );
    } catch (error) {
      errorService.reportError(error);
      setIsMovingItem(false);
      showMoveError();
      return;
    }
    await executeMoveItems(finalItemsToMove);
  };

  const handleNameCollisionClose = () => {
    setMoveCollisions([]);
    setConfirmModalOpen(true);
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
      if (originFolderContentResponse?.uuid && driveCtx.focusedFolder) {
        await driveCtx.loadFolderContent(driveCtx.focusedFolder.uuid, {
          resetPagination: true,
          pullFrom: ['network'],
          loadAllContent: true,
        });
      }
    }
    await dispatch(driveActions.setItemsToMove([]));
    await dispatch(uiActions.setShowMoveModal(false));
  };
  const onCancelButtonPressed = async () => {
    await cleanUp();
  };
  const getOriginFolderName = () => {
    return (
      (originFolderContentResponse?.parentUuid
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
  const onNavigationButtonPressed = async (item: DriveItemData) => {
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
                  key={item.data.uuid}
                  disabled={checkIsFile(item.data as any) || uuidsToMove.has(item.data.uuid)}
                  type={DriveListType.Drive}
                  status={DriveItemStatus.Idle}
                  viewMode={DriveListViewMode.List}
                  onItemPressed={onNavigationButtonPressed}
                  data={item.data}
                />
              );
            }}
            keyExtractor={(folder) => folder.data.uuid}
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
        items={itemsToMove}
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
      {destinationFolderContentResponse?.uuid ? (
        <CreateFolderModal
          isOpen={createFolderModalOpen}
          onCancel={onCancelCreateFolder}
          onClose={onCloseCreateFolder}
          currentFolderUuid={destinationFolderContentResponse?.uuid}
          onFolderCreated={onFolderCreated}
        />
      ) : null}
      <NameCollisionModal
        key={currentCollision?.item.uuid}
        isOpen={!!currentCollision}
        itemName={currentCollision ? drive.file.getName(currentCollision.item.name, currentCollision.item.type) : ''}
        collisionCount={1}
        itemType={currentCollision?.item.isFolder ? 'folder' : 'file'}
        confirmLabel={strings.buttons.move}
        showApplyToAll={pendingCollisions.length > 1}
        onClose={handleNameCollisionClose}
        onConfirm={handleNameCollisionAction}
        onSkip={(shouldApplyToAll) => handleNameCollisionAction('skip', shouldApplyToAll)}
      />
    </Portal>
  );
}

export default MoveItemsModal;
