import { LinearGradient } from 'expo-linear-gradient';
import { ArrowUpIcon, CloudIcon, CloudSlashIcon, ImageIcon } from 'phosphor-react-native';
import { memo, useCallback, useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Circle } from 'react-native-progress';
import AppText from 'src/components/AppText';
import useGetColor from 'src/hooks/useColor';
import { useTailwind } from 'tailwind-rn';
import { useCloudThumbnail } from '../hooks/useCloudThumbnail';
import { CloudPhotoItem, PhotoItem as PhotoItemType, TimelinePhotoItem } from '../types';

const SkeletonCell = (): JSX.Element => {
  const getColor = useGetColor();
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0.2, duration: 1500, easing: Easing.linear, useNativeDriver: false }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 800, easing: Easing.linear, useNativeDriver: false }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View style={[styles.container, { backgroundColor: getColor('bg-primary-10'), opacity: fadeAnim }]} />
  );
};

const UploadProgressRing = ({ progress, color }: { progress: number; color: string }): JSX.Element => (
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
  const tailwind = useTailwind();
  const getColor = useGetColor();

  if (!isSelectMode && !isSelected) {
    return null;
  }

  return (
    <View
      style={[
        tailwind('absolute top-2 items-center justify-center'),
        styles.checkbox,
        isSelected && { backgroundColor: getColor('bg-primary'), borderColor: 'transparent' },
      ]}
    >
      {isSelected && <View style={styles.checkmark} />}
    </View>
  );
};

const LocalPhotoCell = memo(
  ({ item, isSelectMode, isSelected, onPress, onLongPress }: CellProps & { item: PhotoItemType }): JSX.Element => {
    const tailwind = useTailwind();
    const getColor = useGetColor();

    const handlePress = useCallback(() => onPress?.(item.id), [onPress, item.id]);
    const handleLongPress = useCallback(() => onLongPress?.(item.id), [onLongPress, item.id]);

    if (item.backupState === 'loading' || !item.uri) {
      return <SkeletonCell />;
    }

    const containerStyle = [styles.container, { backgroundColor: getColor('bg-gray-1') }];

    return (
      <TouchableOpacity activeOpacity={0.85} style={containerStyle} onPress={handlePress} onLongPress={handleLongPress}>
        <Image source={{ uri: item.uri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />

        {(item.backupState === 'not-backed' || item.backupState === 'uploading') && (
          <View style={[tailwind('absolute justify-center items-center'), { bottom: 8, left: 8 }]} pointerEvents="none">
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.08)', 'rgba(0,0,0,0.32)', 'rgba(0,0,0,0.6)']}
              locations={[0, 0.4, 0.7, 1]}
              start={{ x: 1, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.badgeShadow}
            />
            {item.backupState === 'not-backed' ? (
              <CloudSlashIcon size={18} color={getColor('text-white')} weight="light" />
            ) : (
              <UploadProgressRing progress={item.uploadProgress ?? 0} color={getColor('text-white')} />
            )}
          </View>
        )}

        {item.mediaType === 'video' && item.duration && (
          <View style={[tailwind('absolute justify-center items-end'), { bottom: 8, right: 8 }]} pointerEvents="none">
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.08)', 'rgba(0,0,0,0.32)', 'rgba(0,0,0,0.6)']}
              locations={[0, 0.4, 0.7, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.durationShadow}
            />
            <AppText medium style={[tailwind('text-sm'), { color: getColor('text-white') }]}>
              {item.duration}
            </AppText>
          </View>
        )}

        <SelectOverlay isSelectMode={isSelectMode} isSelected={isSelected} />
      </TouchableOpacity>
    );
  },
);

const CloudPhotoCell = memo(
  ({ item, isSelectMode, isSelected, onPress, onLongPress }: CellProps & { item: CloudPhotoItem }): JSX.Element => {
    const tailwind = useTailwind();
    const getColor = useGetColor();
    const { uri: thumbnailUri, onImageError } = useCloudThumbnail(item);

    const handlePress = useCallback(() => {
      console.log('[CloudPhotoCell] press', JSON.stringify(item, null, 2));
      onPress?.(item.id);
    }, [onPress, item.id]);
    const handleLongPress = useCallback(() => onLongPress?.(item.id), [onLongPress, item.id]);

    const containerStyle = [styles.container, { backgroundColor: getColor('bg-gray-1') }];

    return (
      <TouchableOpacity activeOpacity={0.85} style={containerStyle} onPress={handlePress} onLongPress={handleLongPress}>
        {thumbnailUri ? (
          <Image
            source={{ uri: thumbnailUri }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
            onError={onImageError}
          />
        ) : (
          <View style={[StyleSheet.absoluteFillObject, tailwind('items-center justify-center')]}>
            <ImageIcon size={24} color={getColor('text-gray-40')} weight="thin" />
          </View>
        )}

        <View style={[tailwind('absolute justify-center items-center'), { top: 6, right: 6 }]} pointerEvents="none">
          <CloudIcon size={14} color={getColor('text-white')} weight="fill" />
        </View>

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
  badgeShadow: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 80,
    height: 40,
    borderTopRightRadius: 100,
  },
  durationShadow: {
    position: 'absolute',
    bottom: -20,
    right: -20,
    width: 80,
    height: 40,
    borderTopLeftRadius: 100,
  },
  checkbox: {
    left: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'white',
    backgroundColor: 'rgba(0,0,0,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  progressRing: {
    width: 22,
    height: 22,
  },
  progressRingIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    width: 12,
    height: 7,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: 'white',
    transform: [{ rotate: '-45deg' }, { translateY: -1 }],
  },
});

export default PhotoItem;
