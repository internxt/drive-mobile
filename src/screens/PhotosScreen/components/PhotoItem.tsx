import { ArrowUpIcon, CloudSlashIcon } from 'phosphor-react-native';
import { memo, useCallback } from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Circle } from 'react-native-progress';
import AppText from 'src/components/AppText';
import useGetColor from 'src/hooks/useColor';
import { useTailwind } from 'tailwind-rn';
import { PhotoItem as PhotoItemType } from '../types';

interface PhotoItemProps {
  item: PhotoItemType;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onPress?: (id: string) => void;
  onLongPress?: (id: string) => void;
}

const PhotoItem = memo(({ item, isSelectMode, isSelected, onPress, onLongPress }: PhotoItemProps): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  const handlePress = useCallback(() => onPress?.(item.id), [onPress, item.id]);
  const handleLongPress = useCallback(() => onLongPress?.(item.id), [onLongPress, item.id]);
  const containerStyle = [styles.container, { backgroundColor: getColor('bg-primary-10') }];

  if (item.backupState === 'loading' || !item.uri) {
    return <View style={containerStyle} />;
  }

  return (
    <TouchableOpacity activeOpacity={0.85} style={containerStyle} onPress={handlePress} onLongPress={handleLongPress}>
      <Image source={{ uri: item.uri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />

      {(item.backupState === 'not-backed' || item.backupState === 'uploading') && (
        <View style={[tailwind('absolute justify-center items-center'), { bottom: 8, left: 8 }]} pointerEvents="none">
          <View style={styles.badgeShadow} />
          {item.backupState === 'not-backed' ? (
            <CloudSlashIcon size={18} color={getColor('text-white')} weight="light" />
          ) : (
            <UploadProgressRing progress={item.uploadProgress ?? 0} color={getColor('text-white')} />
          )}
        </View>
      )}

      {item.mediaType === 'video' && item.duration && (
        <View style={[tailwind('absolute justify-center items-end'), { bottom: 8, right: 8 }]} pointerEvents="none">
          <View style={styles.durationShadow} />
          <AppText medium style={[tailwind('text-sm'), { color: getColor('text-white') }]}>
            {item.duration}
          </AppText>
        </View>
      )}

      {(isSelectMode || isSelected) && (
        <View
          style={[
            tailwind('absolute top-2 items-center justify-center'),
            styles.checkbox,
            isSelected && { backgroundColor: getColor('bg-primary'), borderColor: 'transparent' },
          ]}
        >
          {isSelected && <View style={styles.checkmark} />}
        </View>
      )}
    </TouchableOpacity>
  );
});

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
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  durationShadow: {
    position: 'absolute',
    bottom: -20,
    right: -20,
    width: 80,
    height: 40,
    borderTopLeftRadius: 100,
    backgroundColor: 'rgba(0,0,0,0.6)',
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
