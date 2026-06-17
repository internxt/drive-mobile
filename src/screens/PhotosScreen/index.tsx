import { useFocusEffect, useNavigation } from '@react-navigation/native';
import strings from 'assets/lang/strings';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import AppScreen from 'src/components/AppScreen';
import { ConfirmModal } from 'src/components/modals/ConfirmModal/ConfirmModal';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { paymentsThunks } from 'src/store/slices/payments';
import {
  forceRefreshThunk,
  pauseBackupThunk,
  photosActions,
  resumeBackupThunk,
  runBackupCycleThunk,
} from 'src/store/slices/photos';
import { hasPhotosFeatureAccess } from 'src/store/slices/photos/selectors';
import { uiActions } from 'src/store/slices/ui';
import { TabExplorerScreenNavigationProp } from 'src/types/navigation';
import { useTailwind } from 'tailwind-rn';
import notificationsService from '../../services/NotificationsService';
import { photoPermissionService } from '../../services/photos/photoPermissionService';
import { NotificationType } from '../../types';
import ActionProgressModal from './components/ActionProgressModal';
import BackupDisabledBanner from './components/BackupDisabledBanner';
import LimitedAccessBanner from './components/LimitedAccessBanner';
import MoreActionsBottomSheet from './components/MoreActionsBottomSheet';
import PhotosHeader from './components/PhotosHeader';
import PhotosLockedOverlay from './components/PhotosLockedOverlay';
import PhotosTimeline, { PhotosTimelineHandle } from './components/PhotosTimeline';
import SelectionHeader from './components/SelectionHeader';
import SelectionToolbar from './components/SelectionToolbar';
import EnableBackupBottomSheet from './EnableBackupBottomSheet';
import { usePhotoActions } from './hooks/usePhotoActions';
import { usePhotoSelection } from './hooks/usePhotoSelection';
import { usePhotosTimeline } from './hooks/usePhotosTimeline';
import useSelectMorePhotos from './hooks/useSelectMorePhotos';
import { PhotosAccessState, TimelinePhotoItem } from './types';

const PhotosScreen = (): JSX.Element => {
  const tailwind = useTailwind();
  const dispatch = useAppDispatch();
  const navigation = useNavigation<TabExplorerScreenNavigationProp<'Photos'>>();
  const enabled = useAppSelector((state) => state.photos.enabled);
  const hasAccess = useAppSelector(hasPhotosFeatureAccess);
  const permissionStatus = useAppSelector((state) => state.photos.permissionStatus);
  const [isEnableBackupSheetOpen, setIsEnableBackupSheetOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { timelineDateGroups, isLoading, loadNextPage, reloadLocal, reloadCloud } = usePhotosTimeline();

  const timelineRef = useRef<PhotosTimelineHandle>(null);
  const lastViewedIdRef = useRef<string | null>(null);

  const allItems = useMemo<TimelinePhotoItem[]>(
    () => timelineDateGroups.flatMap((dateGroup) => dateGroup.group.photos),
    [timelineDateGroups],
  );

  const selection = usePhotoSelection(allItems);
  const actions = usePhotoActions(selection, { reloadLocal, reloadCloud });

  const handleItemChangedFromPreview = useCallback(async () => {
    await Promise.all([reloadLocal(), reloadCloud()]);
  }, [reloadLocal, reloadCloud]);

  const handleCurrentItemChange = useCallback((itemId: string) => {
    lastViewedIdRef.current = itemId;
  }, []);

  const handlePhotoPress = useCallback(
    (id: string) => {
      if (selection.selectMode) {
        selection.toggleSelect(id);
        return;
      }
      navigation.navigate('PhotoPreview', {
        initialId: id,
        items: allItems,
        onItemChanged: handleItemChangedFromPreview,
        onCurrentItemChange: handleCurrentItemChange,
      });
    },
    [selection, navigation, allItems, handleItemChangedFromPreview, handleCurrentItemChange],
  );

  const handlePhotoLongPress = useCallback(
    (id: string) => {
      if (!selection.selectMode) {
        selection.enterSelectMode(id);
      }
    },
    [selection],
  );

  const accessState = useMemo<PhotosAccessState>(() => {
    if (!hasAccess) {
      return { type: 'photos-locked' };
    }
    if (enabled) {
      return { type: 'available' };
    }
    return { type: 'backup-off' };
  }, [hasAccess, enabled]);

  const handleUpgradePress = useCallback(() => navigation.navigate('Settings'), [navigation]);

  const handleSelectPress = useCallback(() => selection.enterSelectMode(), [selection]);

  const handleEnableBackup = useCallback(() => setIsEnableBackupSheetOpen(true), []);

  const handleSelectMorePhotos = useSelectMorePhotos(reloadLocal);

  const listHeader = useMemo(() => {
    if (accessState.type === 'backup-off') {
      return <BackupDisabledBanner onEnablePress={handleEnableBackup} />;
    }
    if (permissionStatus === 'limited') {
      return <LimitedAccessBanner onSelectMorePress={handleSelectMorePhotos} />;
    }

    return undefined;
  }, [accessState.type, permissionStatus, handleEnableBackup, handleSelectMorePhotos]);

  const handlePausePress = useCallback(() => {
    dispatch(pauseBackupThunk());
  }, [dispatch]);
  const handleResumePress = useCallback(() => {
    dispatch(resumeBackupThunk());
  }, [dispatch]);

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
      dispatch(paymentsThunks.loadFileLimitsThunk());

      if (enabled) {
        dispatch(runBackupCycleThunk());
      }

      const id = lastViewedIdRef.current;
      if (id) {
        lastViewedIdRef.current = null;
        timelineRef.current?.scrollToAssetId(id);
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
          ref={timelineRef}
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
          onPausePress={handlePausePress}
          onResumePress={handleResumePress}
        />
        {accessState.type === 'photos-locked' && <PhotosLockedOverlay onUpgradePress={handleUpgradePress} />}
      </View>

      <SelectionToolbar
        visible={selection.selectMode && selection.selectedIds.size > 0}
        selectedItems={selection.selectedItems}
        onExport={actions.handleExport}
        onFavorite={() => undefined}
        onMore={actions.handleMore}
        onDelete={actions.handleDelete}
      />

      <MoreActionsBottomSheet
        isOpen={actions.isMoreActionsSheetOpen}
        selectedItems={selection.selectedItems}
        onClose={actions.handleMoreClose}
        onExport={actions.handleExport}
        onCopy={actions.handleCopy}
        onSave={actions.handleSave}
        onFavorite={() => undefined}
        onTrash={actions.handleTrash}
        onRestore={actions.handleRestore}
      />

      <ActionProgressModal visible={actions.actionLabel !== null} label={actions.actionLabel ?? ''} />

      <ConfirmModal
        isOpen={actions.isDeleteConfirmOpen}
        onClose={actions.handleDeleteClose}
        title={strings.screens.photos.selection.deleteModal.title(selection.selectedIds.size)}
        message={strings.screens.photos.selection.deleteModal.message(selection.selectedIds.size)}
        confirmLabel={strings.screens.photos.selection.deleteModal.confirm}
        onConfirm={actions.handleTrashConfirm}
        onCancel={actions.handleDeleteClose}
        type="confirm-danger"
      />

      <EnableBackupBottomSheet isOpen={isEnableBackupSheetOpen} onClose={() => setIsEnableBackupSheetOpen(false)} />
    </AppScreen>
  );
};

export default PhotosScreen;
