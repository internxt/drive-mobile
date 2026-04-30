import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import AppScreen from 'src/components/AppScreen';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { photosActions, runBackupCycleThunk } from 'src/store/slices/photos';
import { useTailwind } from 'tailwind-rn';
import { photoPermissionService } from '../../services/photos/photoPermissionService';
import BackupDisabledBanner from './components/BackupDisabledBanner';
import PhotosHeader from './components/PhotosHeader';
import PhotosLockedOverlay from './components/PhotosLockedOverlay';
import PhotosTimeline from './components/PhotosTimeline';
import EnableBackupBottomSheet from './EnableBackupBottomSheet';
import { usePhotosTimeline } from './hooks/usePhotosTimeline';
import { PhotosAccessState } from './types';

const PhotosScreen = (): JSX.Element => {
  const tailwind = useTailwind();
  const dispatch = useAppDispatch();
  const { enabled, permissionStatus } = useAppSelector((state) => state.photos);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { timelineDateGroups, isLoading, loadNextPage } = usePhotosTimeline();

  const accessState: PhotosAccessState = useMemo<PhotosAccessState>(
    () => (enabled ? { type: 'available' } : { type: 'backup-off' }),
    [enabled],
  );
  const handleEnableBackup = useCallback(() => setIsSheetOpen(true), []);
  const listHeader =
    accessState.type === 'backup-off' ? <BackupDisabledBanner onEnablePress={handleEnableBackup} /> : undefined;

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
        />
        {accessState.type === 'photos-locked' && <PhotosLockedOverlay onUpgradePress={handleUpgradePress} />}
      </View>

      <EnableBackupBottomSheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)} />
    </AppScreen>
  );
};

export default PhotosScreen;
