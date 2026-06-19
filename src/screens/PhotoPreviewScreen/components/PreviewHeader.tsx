import { LinearGradient } from 'expo-linear-gradient';
import { ArrowUpIcon, CloudSlashIcon, DotsThreeVerticalIcon, XIcon } from 'phosphor-react-native';
import { TouchableOpacity, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../../assets/lang/strings';
import AppText from '../../../components/AppText';
import { TimelinePhotoItem } from '../../PhotosScreen/types';
import { useItemTimestamp } from '../hooks/useItemTimestamp';
import { useLiveBackupStatus } from '../hooks/useLiveBackupStatus';
import { formatHeaderDate, formatHeaderTime } from '../utils/formatters';

const photoPreviewStrings = strings.screens.photos.photoPreview;

const REPRESENTATIVE_PHOTO_COUNT = 1;

const getUploadingLabel = (isBurst: boolean, burstLiveProgress: { uploaded: number; total: number } | null): string => {
  if (isBurst && burstLiveProgress) {
    const uploaded = burstLiveProgress.uploaded + REPRESENTATIVE_PHOTO_COUNT;
    const total = burstLiveProgress.total + REPRESENTATIVE_PHOTO_COUNT;
    return `${photoPreviewStrings.burstBadge} · ${uploaded}/${total}`;
  }
  if (isBurst) {
    return photoPreviewStrings.burstBadge;
  }
  return photoPreviewStrings.uploading;
};

const getBackedBurstLabel = (isBurst: boolean, isUploading: boolean, burstTotal: number | null): string | null => {
  if (isBurst && !isUploading && burstTotal != null) {
    return `${photoPreviewStrings.burstBadge} · ${burstTotal} ${photoPreviewStrings.burstPhotosUnit}`;
  }
  return null;
};

interface TimelineInfoProps {
  isWaitingToUpload: boolean;
  isUploading: boolean;
  isBurst: boolean;
  burstLiveProgress: { uploaded: number; total: number } | null;
  burstTotal: number | null;
  timestamp: number | undefined;
  hasTimeAccuracy: boolean;
}

const TimelineInfo = ({
  isWaitingToUpload,
  isUploading,
  isBurst,
  burstLiveProgress,
  burstTotal,
  timestamp,
  hasTimeAccuracy,
}: TimelineInfoProps): JSX.Element | null => {
  const tailwind = useTailwind();

  const uploadLabel = getUploadingLabel(isBurst, burstLiveProgress);
  const backedBurstLabel = getBackedBurstLabel(isBurst, isUploading, burstTotal);

  const showUploadRow = isWaitingToUpload || isUploading;
  if (!showUploadRow && !backedBurstLabel && (!timestamp || !hasTimeAccuracy)) {
    return null;
  }
  const showSeparator = showUploadRow && timestamp && hasTimeAccuracy;

  return (
    <View style={[tailwind('flex-row items-center justify-center opacity-75'), { gap: 8 }]}>
      {timestamp && hasTimeAccuracy && (
        <AppText style={tailwind('text-sm text-white')}>{formatHeaderTime(timestamp)}</AppText>
      )}
      {showSeparator && <AppText style={tailwind('text-sm text-white')}>·</AppText>}
      {isWaitingToUpload && (
        <View style={[tailwind('flex-row items-center'), { gap: 4 }]}>
          <CloudSlashIcon size={16} color="white" />
          <AppText style={tailwind('text-sm text-white')}>{photoPreviewStrings.waitingToUpload}</AppText>
        </View>
      )}
      {isUploading && (
        <View style={[tailwind('flex-row items-center'), { gap: 4 }]}>
          <ArrowUpIcon size={16} color="white" />
          <AppText style={tailwind('text-sm text-white')}>{uploadLabel}</AppText>
        </View>
      )}
      {backedBurstLabel && !showUploadRow && (
        <AppText style={tailwind('text-sm text-white')}>{backedBurstLabel}</AppText>
      )}
    </View>
  );
};

interface PreviewHeaderProps {
  visible: boolean;
  item: TimelinePhotoItem | undefined;
  onClose: () => void;
  onMore: () => void;
}

export const PreviewHeader = ({ visible, item, onClose, onMore }: PreviewHeaderProps): JSX.Element => {
  const tailwind = useTailwind();
  const insets = useSafeAreaInsets();

  const {
    isWaitingToUpload,
    isUploading,
    progress: uploadProgress,
    isBurst,
    burstLiveProgress,
    burstTotal,
  } = useLiveBackupStatus(item);
  const timestamp = useItemTimestamp(item);
  const hasTimeAccuracy = !!timestamp;

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: withTiming(visible ? 1 : 0, { duration: 150, easing: Easing.out(Easing.quad) }),
    transform: [{ translateY: withTiming(visible ? 0 : -20, { duration: 150, easing: Easing.out(Easing.quad) }) }],
  }));

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[animatedStyle, { position: 'absolute', top: 0, left: 0, right: 0 }]}
    >
      <LinearGradient
        colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ paddingTop: insets.top + 8, paddingBottom: 20, paddingHorizontal: 16 }}
      >
        <View style={[tailwind('flex-row'), { height: 80 }]}>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={[tailwind('justify-center items-center'), { width: 60, height: 80 }]}
          >
            <XIcon size={28} color="white" />
          </TouchableOpacity>

          <View style={[tailwind('flex-1 justify-center items-center px-2'), { height: 80, gap: 16 }]}>
            <View style={tailwind('w-full items-center')}>
              <AppText medium style={tailwind('text-base text-white')} numberOfLines={1}>
                {timestamp ? formatHeaderDate(timestamp) : '-'}
              </AppText>
              <TimelineInfo
                isWaitingToUpload={isWaitingToUpload}
                isUploading={isUploading}
                isBurst={isBurst}
                burstLiveProgress={burstLiveProgress}
                burstTotal={burstTotal}
                timestamp={timestamp}
                hasTimeAccuracy={hasTimeAccuracy}
              />
            </View>
            {isUploading && (
              <View
                style={[
                  tailwind('w-full overflow-hidden'),
                  { height: 3, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.2)' },
                ]}
              >
                <View style={{ width: `${uploadProgress * 100}%`, height: '100%', backgroundColor: 'white' }} />
              </View>
            )}
          </View>

          <TouchableOpacity
            onPress={onMore}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={[tailwind('justify-center items-center'), { width: 60, height: 80 }]}
          >
            <DotsThreeVerticalIcon size={28} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};
