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
  GroupHeaderPausedNoConnection,
  GroupHeaderPausedNoWifi,
  GroupHeaderPausedStorageFull,
  GroupHeaderPausing,
  GroupHeaderScanning,
  GroupHeaderSelection,
  GroupHeaderUploadError,
  GroupHeaderUploading,
  useGroupHeaderColors,
} from './GroupHeaderStatus';

export type GroupSyncStatus =
  | { type: 'count'; count: number }
  | { type: 'scanning' }
  | { type: 'fetching' }
  | { type: 'uploading'; count?: number; backupProgress?: number }
  | { type: 'pausing' }
  | { type: 'paused'; count: number }
  | { type: 'paused-storage-full' }
  | { type: 'paused-no-wifi' }
  | { type: 'paused-no-connection' }
  | { type: 'completed' }
  | { type: 'upload-error'; count: number }
  | { type: 'selection'; count: number }
  | { type: 'none' };

interface PhotosGroupHeaderProps {
  label: string;
  syncStatus: GroupSyncStatus;
  isSticky?: boolean;
  stickyOpacity?: Animated.AnimatedInterpolation<number>;
  onPausePress?: () => void;
  onResumePress?: () => void;
  onRetryPress?: () => void;
}

const GRADIENT_LOCATIONS: [number, number, number] = [0, 0.35, 1];

const renderSyncStatus = ({
  syncStatus,
  isSticky,
  onPausePress,
  onResumePress,
  onRetryPress,
}: {
  syncStatus: GroupSyncStatus;
  isSticky?: boolean;
  onPausePress?: () => void;
  onResumePress?: () => void;
  onRetryPress?: () => void;
}): JSX.Element | null => {
  switch (syncStatus.type) {
    case 'count':
      return <GroupHeaderCount count={syncStatus.count} isSticky={isSticky} />;
    case 'scanning':
      return <GroupHeaderScanning isSticky={isSticky} />;
    case 'fetching':
      return <GroupHeaderFetching isSticky={isSticky} />;
    case 'uploading':
      return <GroupHeaderUploading count={syncStatus.count} isSticky={isSticky} onPausePress={onPausePress} />;
    case 'pausing':
      return <GroupHeaderPausing isSticky={isSticky} />;
    case 'paused':
      return <GroupHeaderPaused count={syncStatus.count} isSticky={isSticky} onResumePress={onResumePress} />;
    case 'paused-storage-full':
      return <GroupHeaderPausedStorageFull />;
    case 'paused-no-wifi':
      return <GroupHeaderPausedNoWifi isSticky={isSticky} />;
    case 'paused-no-connection':
      return <GroupHeaderPausedNoConnection isSticky={isSticky} />;
    case 'completed':
      return <GroupHeaderCompleted isSticky={isSticky} />;
    case 'upload-error':
      return <GroupHeaderUploadError count={syncStatus.count} isSticky={isSticky} onPress={onRetryPress} />;
    case 'none':
      return null;
    default:
      return null;
  }
};

const BackupProgressBar = ({
  progress,
  fillColor,
  trackColor,
}: {
  progress: number;
  fillColor: string;
  trackColor: string;
}): JSX.Element => (
  <View style={[styles.progressTrack, { backgroundColor: trackColor }]}>
    <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: fillColor }]} />
  </View>
);

const PhotosGroupHeader = memo(
  ({
    label,
    syncStatus,
    isSticky,
    stickyOpacity,
    onPausePress,
    onResumePress,
    onRetryPress,
  }: PhotosGroupHeaderProps): JSX.Element => {
    const tailwind = useTailwind();
    const getColor = useGetColor();
    const { labelColor, primaryColor } = useGroupHeaderColors(isSticky);

    const gradientColors: [string, string, string] = [getColor('bg-black-50'), getColor('bg-black-40'), 'transparent'];

    const isUploading = syncStatus.type === 'uploading';
    const backupUploadProgress = isUploading ? (syncStatus.backupProgress ?? 0) : undefined;
    const progressTrackColor = isSticky ? getColor('bg-white-25') : getColor('bg-primary-10');

    const content = (
      <View
        style={[
          tailwind('h-16 justify-center'),
          !isSticky && { backgroundColor: getColor('bg-surface') },
          { overflow: 'visible' },
        ]}
      >
        {isSticky && (
          <LinearGradient
            colors={gradientColors}
            locations={GRADIENT_LOCATIONS}
            style={StyleSheet.absoluteFillObject}
          />
        )}

        {backupUploadProgress != null && (
          <BackupProgressBar progress={backupUploadProgress} fillColor={primaryColor} trackColor={progressTrackColor} />
        )}

        <View style={tailwind('flex-row items-center px-4')}>
          {syncStatus.type === 'selection' ? (
            <View style={{ flex: 1 }}>
              <GroupHeaderSelection count={syncStatus.count} isSticky={isSticky} />
            </View>
          ) : (
            <>
              <AppText semibold style={[tailwind('text-lg'), { color: labelColor, flex: 1 }]}>
                {label}
              </AppText>
              <View style={[tailwind('flex-row items-center'), { gap: 8, maxWidth: 250 }]}>
                {renderSyncStatus({ syncStatus, isSticky, onPausePress, onResumePress, onRetryPress })}
              </View>
            </>
          )}
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
