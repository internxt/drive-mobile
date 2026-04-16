import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import AppText from 'src/components/AppText';
import useGetColor from 'src/hooks/useColor';
import { useTailwind } from 'tailwind-rn';
import {
  GroupHeaderCompleted,
  GroupHeaderCount,
  GroupHeaderFetching,
  GroupHeaderPaused,
  GroupHeaderPausedStorageFull,
  GroupHeaderUploading,
} from './GroupHeaderStatus';

export type GroupSyncStatus =
  | { type: 'count'; count: number }
  | { type: 'fetching' }
  | { type: 'uploading'; count?: number; backupProgress?: number }
  | { type: 'paused'; count: number }
  | { type: 'paused-storage-full' }
  | { type: 'completed' }
  | { type: 'none' };

interface PhotosGroupHeaderProps {
  label: string;
  syncStatus: GroupSyncStatus;
  isSticky?: boolean;
  stickyOpacity?: Animated.AnimatedInterpolation<number>;
}

const GRADIENT_LOCATIONS: [number, number, number] = [0, 0.35, 1];

const BackupProgressBar = ({ progress, color }: { progress: number; color: string }): JSX.Element => (
  <View style={styles.progressTrack}>
    <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: color }]} />
  </View>
);

const PhotosGroupHeader = memo(
  ({ label, syncStatus, isSticky, stickyOpacity }: PhotosGroupHeaderProps): JSX.Element => {
    const tailwind = useTailwind();
    const getColor = useGetColor();

    const labelColor = isSticky ? getColor('text-white') : getColor('text-gray-100');
    const statusColor = isSticky ? getColor('text-white-90') : getColor('text-gray-60');
    const primaryColor = isSticky ? getColor('text-white') : getColor('text-primary');
    const dangerColor = getColor('text-red');
    const gradientColors: [string, string, string] = [getColor('bg-black-50'), getColor('bg-black-40'), 'transparent'];

    const backupProgress = syncStatus.type === 'uploading' ? syncStatus.backupProgress : undefined;

    const content = (
      <View
        style={[
          tailwind('h-16 justify-center overflow-hidden'),
          !isSticky && { backgroundColor: getColor('bg-surface') },
        ]}
      >
        {isSticky && (
          <LinearGradient
            colors={gradientColors}
            locations={GRADIENT_LOCATIONS}
            style={StyleSheet.absoluteFillObject}
          />
        )}

        {backupProgress != null && <BackupProgressBar progress={backupProgress} color={primaryColor} />}

        <View style={tailwind('flex-row items-center justify-between px-4')}>
          <AppText semibold style={[tailwind('text-lg'), { color: labelColor }]}>
            {label}
          </AppText>

          <View style={[tailwind('flex-row items-center overflow-hidden'), { maxWidth: 226, gap: 8 }]}>
            {syncStatus.type === 'count' && <GroupHeaderCount count={syncStatus.count} color={statusColor} />}
            {syncStatus.type === 'fetching' && <GroupHeaderFetching color={statusColor} />}
            {syncStatus.type === 'uploading' && (
              <GroupHeaderUploading
                count={syncStatus.count}
                primaryColor={primaryColor}
                labelColor={labelColor}
                statusColor={statusColor}
              />
            )}
            {syncStatus.type === 'paused' && (
              <GroupHeaderPaused
                count={syncStatus.count}
                primaryColor={primaryColor}
                labelColor={labelColor}
                statusColor={statusColor}
              />
            )}
            {syncStatus.type === 'paused-storage-full' && <GroupHeaderPausedStorageFull dangerColor={dangerColor} />}
            {syncStatus.type === 'completed' && <GroupHeaderCompleted color={labelColor} />}
          </View>
        </View>
      </View>
    );

    if (isSticky && stickyOpacity != null) {
      return <Animated.View style={{ opacity: stickyOpacity }}>{content}</Animated.View>;
    }

    return content;
  },
);

const styles = StyleSheet.create({
  progressTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  progressFill: {
    height: 2,
  },
});

export default PhotosGroupHeader;
