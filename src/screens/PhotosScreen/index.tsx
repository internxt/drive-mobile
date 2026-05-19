import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import AppScreen from 'src/components/AppScreen';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { forceRefreshThunk, photosActions, runBackupCycleThunk } from 'src/store/slices/photos';
import { TabExplorerScreenNavigationProp } from 'src/types/navigation';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../assets/lang/strings';
import { photoPermissionService } from '../../services/photos/photoPermissionService';
import notificationsService from '../../services/NotificationsService';
import { NotificationType } from '../../types';
import BackupDisabledBanner from './components/BackupDisabledBanner';
import PhotosHeader from './components/PhotosHeader';
import PhotosLockedOverlay from './components/PhotosLockedOverlay';
import PhotosTimeline from './components/PhotosTimeline';
import EnableBackupBottomSheet from './EnableBackupBottomSheet';
import { usePhotosTimeline } from './hooks/usePhotosTimeline';
import { PhotosAccessState, TimelinePhotoItem } from './types';

const PhotosScreen = (): JSX.Element => {
  const tailwind = useTailwind();
  const dispatch = useAppDispatch();
  const navigation = useNavigation<TabExplorerScreenNavigationProp<'Photos'>>();
  const { enabled, permissionStatus } = useAppSelector((state) => state.photos);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { timelineDateGroups, isLoading, loadNextPage, reloadLocal } = usePhotosTimeline();

  const allItems = useMemo<TimelinePhotoItem[]>(
    () => timelineDateGroups.flatMap((dateGroup) => dateGroup.group.photos),
    [timelineDateGroups],
  );

  const handlePhotoPress = useCallback(
    (id: string) => {
      navigation.navigate('PhotoPreview', { initialId: id, items: allItems });
    },
    [navigation, allItems],
  );

  const accessState: PhotosAccessState = useMemo<PhotosAccessState>(
    () => (enabled ? { type: 'available' } : { type: 'backup-off' }),
    [enabled],
  );
  const handleEnableBackup = useCallback(() => setIsSheetOpen(true), []);
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

  const handleSelectPress = useCallback(() => undefined, []);
  const handleUpgradePress = useCallback(() => undefined, []);

  useEffect(() => {
    if (permissionStatus !== 'undetermined') return;

    const checkPermissionStatus = async () => {
      const photoPermissionstatus = await photoPermissionService.getStatus();
      dispatch(photosActions.setPermissionStatus(photoPermissionstatus));
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
      <PhotosHeader onSelectPress={handleSelectPress} />
      <View style={tailwind('flex-1')}>
        <PhotosTimeline
          assetsGroupsByDate={timelineDateGroups}
          isLoading={isLoading}
          ListHeaderComponent={listHeader}
          onEndReached={loadNextPage}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onPhotoPress={handlePhotoPress}
        />
        {accessState.type === 'photos-locked' && <PhotosLockedOverlay onUpgradePress={handleUpgradePress} />}
      </View>

      <EnableBackupBottomSheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)} />
    </AppScreen>
  );
};

export default PhotosScreen;
