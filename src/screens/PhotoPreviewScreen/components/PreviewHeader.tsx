import { LinearGradient } from 'expo-linear-gradient';
import { ArrowUpIcon, CloudSlashIcon, DotsThreeVerticalIcon, XIcon } from 'phosphor-react-native';
import { TouchableOpacity, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../../assets/lang/strings';
import AppText from '../../../components/AppText';
import { TimelinePhotoItem } from '../../PhotosScreen/types';
import { formatHeaderDate, formatHeaderTime } from '../utils/formatters';

const photoPreviewStrings = strings.screens.photos.photoPreview;

interface TimelineInfoProps {
  isWaitingToUpload: boolean;
  isUploading: boolean;
  timestamp: number | undefined;
  hasTimeAccuracy: boolean;
}

const TimelineInfo = ({ isWaitingToUpload, isUploading, timestamp, hasTimeAccuracy }: TimelineInfoProps): JSX.Element | null => {
  const tailwind = useTailwind();
  if (!isWaitingToUpload && !isUploading && (!timestamp || !hasTimeAccuracy)) return null;
  const showSeparator = (isWaitingToUpload || isUploading) && timestamp && hasTimeAccuracy;
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
          <AppText style={tailwind('text-sm text-white')}>{photoPreviewStrings.uploading}</AppText>
        </View>
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

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: withTiming(visible ? 1 : 0, { duration: 150, easing: Easing.out(Easing.quad) }),
    transform: [{ translateY: withTiming(visible ? 0 : -20, { duration: 150, easing: Easing.out(Easing.quad) }) }],
  }));

  const isWaitingToUpload = item?.type === 'local' && item.backupState === 'not-backed';
  // TODO: uploadProgress is never populated in the photos backup flow (PhotoUploadService does not write it to the store).
  // To wire it up: write progress (0–1) from the upload slice into the PhotoItem, and it will render here automatically.
  const isUploading = item?.type === 'local' && item.backupState === 'uploading';
  const uploadProgress = item?.type === 'local' ? (item.uploadProgress ?? 0) : 0;
  const timestamp = item?.createdAt;
  // TODO: cloud items always have createdAt at midnight (built from folder year/month/day in PhotoCloudBrowser).
  // The SDK's file.createdAt is the upload time, not the photo capture time, so it's not a valid substitute.
  // To fix: store original capture time on upload and populate during cloud sync.
  const hasTimeAccuracy = item?.type === 'local';
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
                timestamp={timestamp}
                hasTimeAccuracy={hasTimeAccuracy}
              />
            </View>
            {isUploading && (
              <View style={[tailwind('w-full overflow-hidden'), { height: 3, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.2)' }]}>
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
