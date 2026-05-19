import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import AppScreen from 'src/components/AppScreen';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { forceRefreshThunk, photosActions, runBackupCycleThunk } from 'src/store/slices/photos';
import { uiActions } from 'src/store/slices/ui';
import { TabExplorerScreenNavigationProp } from 'src/types/navigation';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../assets/lang/strings';
import { photoPermissionService } from '../../services/photos/photoPermissionService';
import notificationsService from '../../services/NotificationsService';
import { NotificationType } from '../../types';
import BackupDisabledBanner from './components/BackupDisabledBanner';
import MoreActionsBottomSheet from './components/MoreActionsBottomSheet';
import PhotosHeader from './components/PhotosHeader';
import PhotosLockedOverlay from './components/PhotosLockedOverlay';
import PhotosTimeline from './components/PhotosTimeline';
import SelectionHeader from './components/SelectionHeader';
import SelectionToolbar from './components/SelectionToolbar';
import EnableBackupBottomSheet from './EnableBackupBottomSheet';
import { usePhotoSelection } from './hooks/usePhotoSelection';
import { usePhotosTimeline } from './hooks/usePhotosTimeline';
import { PhotosAccessState, TimelinePhotoItem } from './types';

const PhotosScreen = (): JSX.Element => {
  const tailwind = useTailwind();
  const dispatch = useAppDispatch();
  const navigation = useNavigation<TabExplorerScreenNavigationProp<'Photos'>>();
  const { enabled, permissionStatus } = useAppSelector((state) => state.photos);
  const [isEnableBackupSheetOpen, setIsEnableBackupSheetOpen] = useState(false);
  const [isMoreActionsSheetOpen, setIsMoreActionsSheetOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { timelineDateGroups, isLoading, loadNextPage, reloadLocal } = usePhotosTimeline();

  const allItems = useMemo<TimelinePhotoItem[]>(
    () => timelineDateGroups.flatMap((dateGroup) => dateGroup.group.photos),
    [timelineDateGroups],
  );

  const selection = usePhotoSelection(allItems);

  const handlePhotoPress = useCallback(
    (id: string) => {
      if (selection.selectMode) {
        selection.toggleSelect(id);
        return;
      }
      navigation.navigate('PhotoPreview', { initialId: id, items: allItems });
    },
    [selection, navigation, allItems],
  );

  const handlePhotoLongPress = useCallback(
    (id: string) => {
      if (!selection.selectMode) {
        selection.enterSelectMode(id);
      }
    },
    [selection],
  );

  const handleSelectPress = useCallback(() => selection.enterSelectMode(), [selection]);

  const todoAction = useCallback(
    (name: string) => () => {
      console.log(`action:${name}`, [...selection.selectedIds]);
      selection.exitSelectMode();
      setIsMoreActionsSheetOpen(false);
    },
    [selection],
  );

  const handleMore = useCallback(() => setIsMoreActionsSheetOpen(true), []);
  const handleMoreClose = useCallback(() => setIsMoreActionsSheetOpen(false), []);

  const accessState: PhotosAccessState = useMemo<PhotosAccessState>(
    () => (enabled ? { type: 'available' } : { type: 'backup-off' }),
    [enabled],
  );
  const handleEnableBackup = useCallback(() => setIsEnableBackupSheetOpen(true), []);
  const listHeader =
    accessState.type === 'backup-off' ? <BackupDisabledBanner onEnablePress={handleEnableBackup} /> : undefined;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [localResult, cloudResult] = await Promise.allSettled([
        reloadLocal(),
        dispatch(forceRefreshThunk()).unwrap(),
      ]);

      if (localResult.status === 'rejected') {
        notificationsService.show({
          text1: strings.screens.photos.refreshLocalError,
          type: NotificationType.Error,
          autoHide: false,
        });
      }
      if (cloudResult.status === 'rejected') {
        notificationsService.show({
          text1: strings.screens.photos.refreshCloudError,
          type: NotificationType.Error,
          autoHide: false,
        });
      }
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, reloadLocal]);

  const handleUpgradePress = useCallback(() => undefined, []);

  useEffect(() => {
    dispatch(uiActions.setIsTabBarHidden(selection.selectMode));
  }, [selection.selectMode]);

  useEffect(
    () => () => {
      dispatch(uiActions.setIsTabBarHidden(false));
    },
    [],
  );

  useEffect(() => {
    if (permissionStatus !== 'undetermined') return;

    const checkPermissionStatus = async () => {
      const photoPermissionStatus = await photoPermissionService.getStatus();
      dispatch(photosActions.setPermissionStatus(photoPermissionStatus));
    };

    checkPermissionStatus();
  }, [permissionStatus]);

  useFocusEffect(
    useCallback(() => {
      if (enabled) {
        dispatch(runBackupCycleThunk());
      }
    }, [enabled]),
  );

  return (
    <AppScreen safeAreaTop style={tailwind('flex-1')}>
      {selection.selectMode ? (
        <SelectionHeader selectedCount={selection.selectedIds.size} onCancel={selection.exitSelectMode} />
      ) : (
        <PhotosHeader onSelectPress={handleSelectPress} />
      )}

      <View style={tailwind('flex-1')}>
        <PhotosTimeline
          assetsGroupsByDate={timelineDateGroups}
          isLoading={isLoading}
          ListHeaderComponent={listHeader}
          onEndReached={loadNextPage}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onPhotoPress={handlePhotoPress}
          onPhotoLongPress={handlePhotoLongPress}
          isSelectMode={selection.selectMode}
          selectedIds={selection.selectedIds}
        />
        {accessState.type === 'photos-locked' && <PhotosLockedOverlay onUpgradePress={handleUpgradePress} />}
      </View>

      <SelectionToolbar
        visible={selection.selectMode && selection.selectedIds.size > 0}
        selectedItems={selection.selectedItems}
        onExport={todoAction('export')}
        onFavorite={todoAction('favorite')}
        onMore={handleMore}
        onDelete={todoAction('delete')}
        onInfo={todoAction('info')}
      />

      <MoreActionsBottomSheet
        isOpen={isMoreActionsSheetOpen}
        selectedItems={selection.selectedItems}
        onClose={handleMoreClose}
        onExport={todoAction('export')}
        onCopy={todoAction('copy')}
        onDuplicate={todoAction('duplicate')}
        onSave={todoAction('save')}
        onFavorite={todoAction('favorite')}
        onTrash={todoAction('trash')}
      />

      <EnableBackupBottomSheet isOpen={isEnableBackupSheetOpen} onClose={() => setIsEnableBackupSheetOpen(false)} />
    </AppScreen>
  );
};

export default PhotosScreen;
