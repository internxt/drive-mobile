import { LinearGradient } from 'expo-linear-gradient';
import { DotsThreeOutlineIcon, ExportIcon, TrashIcon } from 'phosphor-react-native';
import { memo, useCallback, useEffect, useRef } from 'react';
import { FlatList, Image, ListRenderItem, TouchableOpacity, View, useWindowDimensions } from 'react-native';
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
const THUMB_ACTIVE_MARGIN = 4;
const THUMB_ITEM_WIDTH = THUMB_W_INACTIVE + THUMB_GAP;

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
      marginHorizontal={isActive ? THUMB_ACTIVE_MARGIN : 0}
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
        marginHorizontal={isActive ? THUMB_ACTIVE_MARGIN : 0}
        onPress={onPress}
      />
    );
  },
);

interface ActionButtonProps {
  icon: JSX.Element;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

const ActionButton = ({ icon, label, onPress, disabled }: ActionButtonProps) => {
  const tailwind = useTailwind();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[tailwind('flex-1 items-center py-2'), { gap: 4, opacity: disabled ? 0.35 : 1 }]}
    >
      {icon}
      <AppText style={tailwind('text-white text-supporting-2')}>{label}</AppText>
    </TouchableOpacity>
  );
};

interface PreviewCarouselProps {
  items: TimelinePhotoItem[];
  currentIndex: number;
  onPress: (index: number) => void;
  onScrub: (index: number) => void;
  onScrubStart: () => void;
  onScrubEnd: () => void;
  visible: boolean;
  onExport: () => void;
  onMore: () => void;
  onDelete: () => void;
  isSynced: boolean;
}

export const PreviewCarousel = ({
  items,
  currentIndex,
  onPress,
  onScrub,
  onScrubStart,
  onScrubEnd,
  visible,
  onExport,
  onMore,
  onDelete,
  isSynced,
}: PreviewCarouselProps): JSX.Element => {
  const tailwind = useTailwind();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const listRef = useRef<FlatList<TimelinePhotoItem>>(null);
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  // True from onScrollBeginDrag until onMomentumScrollEnd (or timer fallback).
  // Stays true during momentum so handleScroll keeps tracking the final settled position.
  const isUserScrollingRef = useRef(false);
  const endScrubTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRenderRef = useRef(true);

  const filmstripPadding = Math.round(screenWidth / 2 - (THUMB_W_ACTIVE / 2 + THUMB_ACTIVE_MARGIN));

  useEffect(() => {
    if (currentIndex < 0 || currentIndex >= items.length) {
      return;
    }
    if (isUserScrollingRef.current) {
      return;
    }

    const animateAutoScroll = !isFirstRenderRef.current;
    isFirstRenderRef.current = false;
    listRef.current?.scrollToOffset({
      offset: Math.max(0, currentIndex * THUMB_ITEM_WIDTH),
      animated: animateAutoScroll,
    });
  }, [currentIndex, items.length]);

  const endScrub = useCallback(() => {
    if (endScrubTimerRef.current) {
      clearTimeout(endScrubTimerRef.current);
      endScrubTimerRef.current = null;
    }
    isUserScrollingRef.current = false;
    onScrubEnd();
  }, [onScrubEnd]);

  const handleScrollBeginDrag = useCallback(() => {
    if (endScrubTimerRef.current) {
      clearTimeout(endScrubTimerRef.current);
      endScrubTimerRef.current = null;
    }
    isUserScrollingRef.current = true;
    onScrubStart();
  }, [onScrubStart]);

  const handleScrollEndDrag = useCallback(() => {
    // Don't end scrub yet — momentum may continue. Short fallback for the case
    // where the user releases on an exact snap point (no momentum, onMomentumScrollEnd won't fire).
    endScrubTimerRef.current = setTimeout(endScrub, 150);
  }, [endScrub]);

  const handleMomentumScrollEnd = useCallback(() => {
    endScrub();
  }, [endScrub]);

  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { x: number } } }) => {
      if (!isUserScrollingRef.current) {
        return;
      }
      const contentOffsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(Math.max(0, Math.min(items.length - 1, contentOffsetX / THUMB_ITEM_WIDTH)));
      if (index !== currentIndexRef.current) {
        onScrub(index);
      }
    },
    [items.length, onScrub],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: withTiming(visible ? 1 : 0, { duration: 150, easing: Easing.out(Easing.quad) }),
    transform: [{ translateY: withTiming(visible ? 0 : 20, { duration: 150, easing: Easing.out(Easing.quad) }) }],
  }));

  const getItemLayout = useCallback(
    (_: ArrayLike<TimelinePhotoItem> | null | undefined, index: number) => ({
      length: THUMB_ITEM_WIDTH,
      offset: THUMB_ITEM_WIDTH * index,
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
            contentContainerStyle={{ paddingHorizontal: filmstripPadding }}
            getItemLayout={getItemLayout}
            windowSize={5}
            initialNumToRender={30}
            maxToRenderPerBatch={20}
            scrollEventThrottle={16}
            decelerationRate="normal"
            snapToInterval={THUMB_ITEM_WIDTH}
            onScroll={handleScroll}
            onScrollBeginDrag={handleScrollBeginDrag}
            onScrollEndDrag={handleScrollEndDrag}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            onScrollToIndexFailed={(info) => {
              logger.error('Scroll to index failed:', info);
            }}
          />
        </View>

        <View style={[tailwind('flex-row'), { paddingBottom: insets.bottom + 8 }]}>
          <ActionButton
            icon={<ExportIcon size={26} color="white" />}
            label="Export"
            onPress={onExport}
            disabled={!isSynced}
          />
          {/* <ActionButton icon={<StarIcon size={26} color="white" />} label="Favorite" onPress={() => undefined} /> */}
          <ActionButton icon={<DotsThreeOutlineIcon size={26} color="white" />} label="More" onPress={onMore} />
          <ActionButton
            icon={<TrashIcon size={26} color="white" />}
            label="Delete"
            onPress={onDelete}
            disabled={!isSynced}
          />
        </View>
      </LinearGradient>
    </Animated.View>
  );
};
