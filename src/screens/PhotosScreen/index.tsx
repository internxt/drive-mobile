import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import AppScreen from 'src/components/AppScreen';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { photosActions, PhotoSyncStatus } from 'src/store/slices/photos';
import { useTailwind } from 'tailwind-rn';
import { photoPermissionService } from '../../services/photos/photoPermissionService';
import BackupDisabledBanner from './components/BackupDisabledBanner';
import { GroupSyncStatus } from './components/GroupHeader/PhotosGroupHeader';
import PhotosHeader from './components/PhotosHeader';
import PhotosLockedOverlay from './components/PhotosLockedOverlay';
import PhotosTimeline, { TimelineDateGroup } from './components/PhotosTimeline';
import EnableBackupBottomSheet from './EnableBackupBottomSheet';
import { MOCK_GROUP, MOCK_GROUP_BACKING_UP, MOCK_MULTI_DATE_GROUPS } from './mockData';
import { PhotosAccessState, PhotosSyncStatus } from './types';

type ScreenVariant =
  | 'scanning'
  | 'fetching'
  | 'uploading'
  | 'paused'
  | 'paused-storage-full'
  | 'completed'
  | 'synced'
  | 'backup-off'
  | 'photos-locked';

interface ScreenConfig {
  syncStatus: PhotosSyncStatus;
  accessState: PhotosAccessState;
  groups: TimelineDateGroup[];
}

const multiDateGroups = ({ first }: { first: GroupSyncStatus }): TimelineDateGroup[] =>
  MOCK_MULTI_DATE_GROUPS.map((group, i) => ({
    group,
    syncStatus: i === 0 ? first : ({ type: 'count', count: group.photos.length } satisfies GroupSyncStatus),
  }));

const getScreenConfig = (variant: ScreenVariant): ScreenConfig => {
  switch (variant) {
    case 'scanning':
      return {
        syncStatus: { type: 'fetching' },
        accessState: { type: 'available' },
        groups: [{ group: MOCK_GROUP, syncStatus: { type: 'scanning' } }],
      };
    case 'fetching':
      return {
        syncStatus: { type: 'fetching' },
        accessState: { type: 'available' },
        groups: [{ group: MOCK_GROUP, syncStatus: { type: 'fetching' } }],
      };
    case 'uploading':
      return {
        syncStatus: { type: 'uploading' },
        accessState: { type: 'available' },
        groups: [{ group: MOCK_GROUP_BACKING_UP, syncStatus: { type: 'uploading', count: 1275, backupProgress: 0.6 } }],
      };
    case 'paused':
      return {
        syncStatus: { type: 'paused' },
        accessState: { type: 'available' },
        groups: multiDateGroups({ first: { type: 'paused', count: 1275 } }),
      };
    case 'paused-storage-full':
      return {
        syncStatus: { type: 'paused' },
        accessState: { type: 'available' },
        groups: multiDateGroups({ first: { type: 'paused-storage-full' } }),
      };
    case 'completed':
      return {
        syncStatus: { type: 'completed' },
        accessState: { type: 'available' },
        groups: multiDateGroups({ first: { type: 'completed' } }),
      };
    case 'synced':
      return {
        syncStatus: { type: 'synced' },
        accessState: { type: 'available' },
        groups: multiDateGroups({ first: { type: 'count', count: 55691 } }),
      };
    case 'backup-off':
      return {
        syncStatus: { type: 'synced' },
        accessState: { type: 'backup-off' },
        groups: multiDateGroups({ first: { type: 'count', count: 55691 } }),
      };
    case 'photos-locked':
      return {
        syncStatus: { type: 'synced' },
        accessState: { type: 'photos-locked' },
        groups: multiDateGroups({ first: { type: 'count', count: 55691 } }),
      };
  }
};

const variantFromSyncStatus: Record<PhotoSyncStatus, ScreenVariant> = {
  scanning: 'scanning',
  idle: 'synced',
  synced: 'synced',
  error: 'synced',
};

const PhotosScreen = (): JSX.Element => {
  const tailwind = useTailwind();
  const dispatch = useAppDispatch();
  const { enabled, permissionStatus, syncStatus } = useAppSelector((state) => state.photos);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useEffect(() => {
    if (permissionStatus !== 'undetermined') return;

    const checkPermissionStatus = async () => {
      const permissionStatus = await photoPermissionService.getStatus();
      dispatch(photosActions.setPermissionStatus(permissionStatus));
    };

    checkPermissionStatus();
  }, [permissionStatus]);

  const variant: ScreenVariant = enabled ? variantFromSyncStatus[syncStatus] : 'backup-off';
  const { accessState, groups } = useMemo(() => getScreenConfig(variant), [variant]);

  const handleEnableBackup = useCallback(() => setIsSheetOpen(true), []);
  const handleSelectPress = useCallback(() => undefined, []);
  const handleUpgradePress = useCallback(() => undefined, []);

  const listHeader =
    accessState.type === 'backup-off' ? <BackupDisabledBanner onEnablePress={handleEnableBackup} /> : undefined;

  return (
    <AppScreen safeAreaTop style={tailwind('flex-1')}>
      <PhotosHeader onSelectPress={handleSelectPress} />
      <View style={tailwind('flex-1')}>
        <PhotosTimeline groups={groups} ListHeaderComponent={listHeader} />
        {accessState.type === 'photos-locked' && <PhotosLockedOverlay onUpgradePress={handleUpgradePress} />}
      </View>
      <EnableBackupBottomSheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)} />
    </AppScreen>
  );
};

export default PhotosScreen;
