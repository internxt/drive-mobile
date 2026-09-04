import { useRecyclingState } from '@shopify/flash-list';
import strings from 'assets/lang/strings';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowUpIcon,
  CheckIcon,
  CloudSlashIcon,
  CloudXIcon,
  ImageIcon,
  PlayIcon,
  WarningIcon,
} from 'phosphor-react-native';
import { memo, useCallback, useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Circle } from 'react-native-progress';
import AppText from 'src/components/AppText';
import useGetColor from 'src/hooks/useColor';
import { useAppSelector } from 'src/store/hooks';
import { useTailwind } from 'tailwind-rn';
import { useCloudThumbnail } from '../hooks/useCloudThumbnail';
import { CloudPhotoItem, PhotoItem as PhotoItemType, TimelinePhotoItem } from '../types';

const SkeletonCell = ({ style }: { style?: StyleProp<ViewStyle> }): JSX.Element => {
  const getColor = useGetColor();
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0.2, duration: 1500, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 800, easing: Easing.linear, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: getColor('bg-gray-10') }, style]}>
      <Animated.View
        style={[StyleSheet.absoluteFillObject, { backgroundColor: getColor('bg-gray-1'), opacity: fadeAnim }]}
      />
    </View>
  );
};

const UploadProgressRing = ({ assetId, color }: { assetId: string; color: string }): JSX.Element => {
  const progress = useAppSelector((state) => state.photos.uploadProgressById[assetId] ?? 0);

  return (
    <View style={styles.progressRing}>
      <Circle
        size={22}
        thickness={2}
        progress={progress}
        color={color}
        unfilledColor="rgba(255,255,255,0.3)"
        borderWidth={0}
      />
      <View style={[StyleSheet.absoluteFillObject, styles.progressRingIcon]}>
        <ArrowUpIcon size={10} color={color} weight="bold" />
      </View>
    </View>
  );
};

interface CellProps {
  isSelectMode?: boolean;
  isSelected?: boolean;
  onPress?: (id: string) => void;
  onLongPress?: (id: string) => void;
}

const SelectOverlay = ({
  isSelectMode,
  isSelected,
}: Pick<CellProps, 'isSelectMode' | 'isSelected'>): JSX.Element | null => {
  const getColor = useGetColor();

  if (!isSelectMode || !isSelected) return null;

  return (
    <>
      <View style={[StyleSheet.absoluteFillObject, styles.scrim]} />
      <View style={[styles.checkbox, { backgroundColor: getColor('text-primary') }]}>
        <CheckIcon size={16} color="white" weight="bold" />
      </View>
    </>
  );
};

const VideoBadge = ({ duration }: { duration?: string }): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  return (
    <View style={[tailwind('absolute justify-center items-end'), { bottom: 8, right: 8 }]} pointerEvents="none">
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.08)', 'rgba(0,0,0,0.32)', 'rgba(0,0,0,0.6)']}
        locations={[0, 0.4, 0.7, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.durationShadow}
      />
      {duration ? (
        <AppText medium style={[tailwind('text-sm'), { color: getColor('text-white') }]}>
          {duration}
        </AppText>
      ) : (
        <PlayIcon size={12} weight="fill" color="#fff" />
      )}
    </View>
  );
};

const LiveBadge = (): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  return (
    <View style={[tailwind('absolute justify-center items-start'), { top: 8, left: 8 }]} pointerEvents="none">
      <LinearGradient
        colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.32)', 'rgba(0,0,0,0.08)', 'transparent']}
        locations={[0, 0.3, 0.6, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.liveBadgeShadow}
      />
      <AppText medium style={[tailwind('text-xs'), { color: getColor('text-white'), letterSpacing: 0.5 }]}>
        LIVE
      </AppText>
    </View>
  );
};

const BurstBadge = ({ isBurstIncomplete }: { isBurstIncomplete?: boolean }): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  return (
    <View style={[tailwind('absolute justify-center items-start'), { top: 8, left: 8 }]} pointerEvents="none">
      <LinearGradient
        colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.32)', 'rgba(0,0,0,0.08)', 'transparent']}
        locations={[0, 0.3, 0.6, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.liveBadgeShadow}
      />
      <View style={tailwind('flex-row items-center')}>
        <AppText medium style={[tailwind('text-xs'), { color: getColor('text-white'), letterSpacing: 0.5 }]}>
          {strings.screens.photos.photoPreview.burstBadge}
        </AppText>
        {isBurstIncomplete && <WarningIcon size={10} weight="fill" color="#F59E0B" style={{ marginLeft: 2 }} />}
      </View>
    </View>
  );
};

export const localPhotoCellAreEqual = (
  prev: CellProps & { item: PhotoItemType },
  next: CellProps & { item: PhotoItemType },
) =>
  prev.item.id === next.item.id &&
  prev.item.backupState === next.item.backupState &&
  prev.item.uri === next.item.uri &&
  prev.item.modificationTime === next.item.modificationTime &&
  prev.item.mediaType === next.item.mediaType &&
  prev.item.duration === next.item.duration &&
  prev.item.isLivePhoto === next.item.isLivePhoto &&
  prev.item.isBurst === next.item.isBurst &&
  prev.item.isBurstUploadIncomplete === next.item.isBurstUploadIncomplete &&
  prev.isSelectMode === next.isSelectMode &&
  prev.isSelected === next.isSelected &&
  prev.onPress === next.onPress &&
  prev.onLongPress === next.onLongPress;

const LocalPhotoCell = memo(
  ({ item, isSelectMode, isSelected, onPress, onLongPress }: CellProps & { item: PhotoItemType }): JSX.Element => {
    const tailwind = useTailwind();
    const getColor = useGetColor();
    const [isImageLoaded, setIsImageLoaded] = useRecyclingState(false, [item.id]);
    // A late onLoad for the cell's *previous* asset (fired after fast-scroll recycled it to
    // a new item) must not mark the new, still-loading asset as loaded — hence the uri check below.
    const currentUriRef = useRef(item.uri);
    currentUriRef.current = item.uri;

    const handlePress = useCallback(() => {
      onPress?.(item.id);
    }, [onPress, item.id]);
    const handleLongPress = useCallback(() => onLongPress?.(item.id), [onLongPress, item.id]);
    const handleLoad = useCallback(
      (event: { source: { url: string } }) => {
        if (event.source.url === currentUriRef.current) {
          setIsImageLoaded(true);
        }
      },
      [setIsImageLoaded],
    );

    if (item.backupState === 'loading' || !item.uri) {
      return <SkeletonCell />;
    }

    const containerStyle = [styles.container, { backgroundColor: getColor('bg-gray-1') }];
    const isCloudDeleted = item.backupState === 'cloud-deleted';

    return (
      <TouchableOpacity activeOpacity={0.85} style={containerStyle} onPress={handlePress} onLongPress={handleLongPress}>
        {/* recyclingKey clears the previous asset's bitmap immediately when FlashList reuses this cell */}
        <ExpoImage
          source={{ uri: item.uri, cacheKey: `${item.id}-${item.modificationTime}` }}
          recyclingKey={item.id}
          style={[StyleSheet.absoluteFillObject, isCloudDeleted && styles.dimmed]}
          contentFit="cover"
          onLoad={handleLoad}
        />
        {!isImageLoaded && <SkeletonCell style={StyleSheet.absoluteFillObject} />}

        {(item.backupState === 'not-backed' ||
          item.backupState === 'uploading' ||
          item.backupState === 'cloud-deleted') && (
          <View style={[tailwind('absolute justify-center items-center'), { bottom: 8, left: 8 }]} pointerEvents="none">
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.08)', 'rgba(0,0,0,0.32)', 'rgba(0,0,0,0.6)']}
              locations={[0, 0.4, 0.7, 1]}
              start={{ x: 1, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.badgeShadow}
            />
            {item.backupState === 'uploading' ? (
              <UploadProgressRing assetId={item.id} color={getColor('text-white')} />
            ) : item.backupState === 'cloud-deleted' ? (
              <CloudXIcon size={18} color={getColor('text-white')} weight="light" />
            ) : (
              <CloudSlashIcon size={18} color={getColor('text-white')} weight="light" />
            )}
          </View>
        )}

        {item.mediaType === 'video' && <VideoBadge duration={item.duration} />}
        {item.isLivePhoto && <LiveBadge />}
        {item.isBurst && <BurstBadge isBurstIncomplete={item.isBurstUploadIncomplete} />}

        <SelectOverlay isSelectMode={isSelectMode} isSelected={isSelected} />
      </TouchableOpacity>
    );
  },
  localPhotoCellAreEqual,
);

const CloudPhotoCell = memo(
  ({ item, isSelectMode, isSelected, onPress, onLongPress }: CellProps & { item: CloudPhotoItem }): JSX.Element => {
    const tailwind = useTailwind();
    const getColor = useGetColor();
    const { uri: thumbnailUri, onImageError } = useCloudThumbnail(item);

    const handlePress = useCallback(() => {
      onPress?.(item.id);
    }, [onPress, item.id]);
    const handleLongPress = useCallback(() => onLongPress?.(item.id), [onLongPress, item.id]);

    const containerStyle = [styles.container, { backgroundColor: getColor('bg-gray-1') }];

    return (
      <TouchableOpacity activeOpacity={0.85} style={containerStyle} onPress={handlePress} onLongPress={handleLongPress}>
        {thumbnailUri ? (
          <ExpoImage
            source={{ uri: thumbnailUri }}
            recyclingKey={item.id}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            onError={onImageError}
          />
        ) : (
          <View style={[StyleSheet.absoluteFillObject, tailwind('items-center justify-center')]}>
            <ImageIcon size={24} color={getColor('text-gray-40')} weight="thin" />
          </View>
        )}

        {/* <View style={[tailwind('absolute justify-center items-center'), { top: 6, right: 6 }]} pointerEvents="none">
          <CloudIcon size={14} color={getColor('text-white')} weight="fill" />
        </View> */}

        {item.mediaType === 'video' && <VideoBadge />}
        {item.isLivePhoto && <LiveBadge />}
        {item.isBurst && <BurstBadge />}
        <SelectOverlay isSelectMode={isSelectMode} isSelected={isSelected} />
      </TouchableOpacity>
    );
  },
);

interface PhotoItemProps extends CellProps {
  item: TimelinePhotoItem;
}

const PhotoItem = memo(({ item, ...rest }: PhotoItemProps): JSX.Element => {
  if (item.type === 'cloud-only') {
    return <CloudPhotoCell item={item} {...rest} />;
  }
  return <LocalPhotoCell item={item} {...rest} />;
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 2,
    overflow: 'hidden',
  },
  dimmed: {
    opacity: 0.5,
  },
  badgeShadow: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 80,
    height: 40,
    borderTopRightRadius: 100,
  },
  liveBadgeShadow: {
    position: 'absolute',
    top: -20,
    left: -20,
    width: 80,
    height: 40,
    borderBottomRightRadius: 100,
  },
  durationShadow: {
    position: 'absolute',
    bottom: -20,
    right: -20,
    width: 80,
    height: 40,
    borderTopLeftRadius: 100,
  },
  scrim: {
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  checkbox: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'white',
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  progressRing: {
    width: 22,
    height: 22,
  },
  progressRingIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PhotoItem;
