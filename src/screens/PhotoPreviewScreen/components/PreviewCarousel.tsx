import { LinearGradient } from 'expo-linear-gradient';
import { DotsThreeOutlineIcon, ExportIcon, StarIcon, TrashIcon } from 'phosphor-react-native';
import { memo, useCallback, useEffect, useRef } from 'react';
import { FlatList, Image, ListRenderItem, TouchableOpacity, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTailwind } from 'tailwind-rn';
import AppText from '../../../components/AppText';
import useGetColor from '../../../hooks/useColor';
import { logger } from '../../../services/common';
import { useCloudThumbnail } from '../../PhotosScreen/hooks/useCloudThumbnail';
import { TimelinePhotoItem } from '../../PhotosScreen/types';

const THUMB_W_INACTIVE = 17;
const THUMB_W_ACTIVE = 26;
const THUMB_H = 26;
const THUMB_GAP = 4;

const CarouselThumb = ({
  uri,
  width,
  marginHorizontal,
  onPress,
  onError,
}: {
  uri: string | null | undefined;
  width: number;
  marginHorizontal: number;
  onPress: () => void;
  onError?: () => void;
}) => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <View
        style={[
          tailwind('overflow-hidden'),
          { width, height: THUMB_H, borderRadius: 3, marginHorizontal, backgroundColor: getColor('bg-gray-90') },
        ]}
      >
        {uri ? <Image source={{ uri }} style={tailwind('w-full h-full')} resizeMode="cover" onError={onError} /> : null}
      </View>
    </TouchableOpacity>
  );
};

const CloudCarouselItem = ({
  item,
  isActive,
  onPress,
}: {
  item: Extract<TimelinePhotoItem, { type: 'cloud-only' }>;
  isActive: boolean;
  onPress: () => void;
}) => {
  const { uri, onImageError } = useCloudThumbnail(item);
  return (
    <CarouselThumb
      uri={uri}
      width={isActive ? THUMB_W_ACTIVE : THUMB_W_INACTIVE}
      marginHorizontal={isActive ? 4 : 0}
      onPress={onPress}
      onError={onImageError}
    />
  );
};

const CarouselItem = memo(
  ({ item, isActive, onPress }: { item: TimelinePhotoItem; isActive: boolean; onPress: () => void }) => {
    if (item.type === 'cloud-only') {
      return <CloudCarouselItem item={item} isActive={isActive} onPress={onPress} />;
    }
    return (
      <CarouselThumb
        uri={item.uri}
        width={isActive ? THUMB_W_ACTIVE : THUMB_W_INACTIVE}
        marginHorizontal={isActive ? 4 : 0}
        onPress={onPress}
      />
    );
  },
);

interface ActionButtonProps {
  icon: JSX.Element;
  label: string;
  onPress: () => void;
}

const ActionButton = ({ icon, label, onPress }: ActionButtonProps) => {
  const tailwind = useTailwind();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={[tailwind('flex-1 items-center py-2'), { gap: 4 }]}>
      {icon}
      <AppText style={tailwind('text-white text-supporting-2')}>{label}</AppText>
    </TouchableOpacity>
  );
};

interface PreviewCarouselProps {
  items: TimelinePhotoItem[];
  currentIndex: number;
  onPress: (index: number) => void;
  visible: boolean;
  onExport: () => void;
  onMore: () => void;
  onDelete: () => void;
}

export const PreviewCarousel = ({
  items,
  currentIndex,
  onPress,
  visible,
  onExport,
  onMore,
  onDelete,
}: PreviewCarouselProps): JSX.Element => {
  const tailwind = useTailwind();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<TimelinePhotoItem>>(null);
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  useEffect(() => {
    const isIndexOutOfBounds = currentIndex < 0 || currentIndex >= items.length;
    if (isIndexOutOfBounds) {
      return;
    }
    listRef.current?.scrollToIndex({ index: currentIndex, animated: true, viewPosition: 0.5 });
  }, [currentIndex, items.length]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: withTiming(visible ? 1 : 0, { duration: 150, easing: Easing.out(Easing.quad) }),
    transform: [{ translateY: withTiming(visible ? 0 : 20, { duration: 150, easing: Easing.out(Easing.quad) }) }],
  }));

  const getItemLayout = useCallback(
    (_: ArrayLike<TimelinePhotoItem> | null | undefined, index: number) => ({
      length: THUMB_W_INACTIVE + THUMB_GAP,
      offset: (THUMB_W_INACTIVE + THUMB_GAP) * index,
      index,
    }),
    [],
  );

  const renderItem: ListRenderItem<TimelinePhotoItem> = useCallback(
    ({ item, index }) => (
      <View style={{ marginRight: index < items.length - 1 ? THUMB_GAP : 0 }}>
        <CarouselItem item={item} isActive={index === currentIndexRef.current} onPress={() => onPress(index)} />
      </View>
    ),
    [items.length, onPress],
  );

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[animatedStyle, { position: 'absolute', bottom: 0, left: 0, right: 0 }]}
    >
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.5)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ paddingTop: 16 }}
      >
        <View style={tailwind('items-center mb-2')}>
          <FlatList
            ref={listRef}
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12 }}
            getItemLayout={getItemLayout}
            windowSize={5}
            initialNumToRender={30}
            maxToRenderPerBatch={20}
            onScrollToIndexFailed={(info) => {
              logger.error('Scroll to index failed:', info);
            }}
          />
        </View>

        <View style={[tailwind('flex-row'), { paddingBottom: insets.bottom + 8 }]}>
          <ActionButton icon={<ExportIcon size={26} color="white" />} label="Export" onPress={onExport} />
          {/* <ActionButton icon={<StarIcon size={26} color="white" />} label="Favorite" onPress={() => undefined} /> */}
          <ActionButton icon={<DotsThreeOutlineIcon size={26} color="white" />} label="More" onPress={onMore} />
          <ActionButton icon={<TrashIcon size={26} color="white" />} label="Delete" onPress={onDelete} />
        </View>
      </LinearGradient>
    </Animated.View>
  );
};
