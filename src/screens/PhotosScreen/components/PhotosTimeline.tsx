import { FlashList, FlashListProps, ListRenderItem } from '@shopify/flash-list';
import { useCallback, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { PhotoDateGroup, PhotoItem as PhotoItemType } from '../types';
import PhotosGroupHeader, { GroupSyncStatus } from './GroupHeader/PhotosGroupHeader';
import PhotoItem from './PhotoItem';

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList) as React.ComponentType<FlashListProps<FlatItem>>;

export type TimelineDateGroup = { group: PhotoDateGroup; syncStatus: GroupSyncStatus };

type FlatItem =
  | { type: 'header'; id: string; label: string; syncStatus: GroupSyncStatus }
  | { type: 'photo'; photo: PhotoItemType };

const NUM_COLUMNS = 3;

interface PhotosTimelineProps {
  groups: TimelineDateGroup[];
  onPhotoPress?: (id: string) => void;
  onPhotoLongPress?: (id: string) => void;
  isSelectMode?: boolean;
  selectedIds?: Set<string>;
  ListHeaderComponent?: React.ReactElement;
}

const flattenGroups = (groups: TimelineDateGroup[]): { items: FlatItem[]; headerIndices: number[] } => {
  const items: FlatItem[] = [];
  const headerIndices: number[] = [];
  for (const { group, syncStatus } of groups) {
    const currentHeaderIndex = items.length;
    headerIndices.push(currentHeaderIndex);
    items.push({ type: 'header', id: group.id, label: group.label, syncStatus });
    for (const photo of group.photos) {
      items.push({ type: 'photo', photo });
    }
  }
  return { items, headerIndices };
};

const getItemType = (item: FlatItem) => item.type;

const overrideItemLayout = (layout: { span?: number }, item: FlatItem) => {
  if (item.type === 'header') {
    layout.span = NUM_COLUMNS;
  }
};

const keyExtractor = (item: FlatItem) => (item.type === 'header' ? `header-${item.id}` : item.photo.id);

const PhotosTimeline = ({
  groups,
  onPhotoPress,
  onPhotoLongPress,
  isSelectMode,
  selectedIds,
  ListHeaderComponent,
}: PhotosTimelineProps) => {
  const { items, headerIndices } = useMemo(() => flattenGroups(groups), [groups]);

  const extraData = useMemo(() => ({ isSelectMode, selectedIds }), [isSelectMode, selectedIds]);

  const scrollY = useRef(new Animated.Value(0)).current;
  const stickyOpacity = useMemo(
    () => scrollY.interpolate({ inputRange: [0, 24], outputRange: [0, 1], extrapolate: 'clamp' }),
    [scrollY],
  );

  const renderItem: ListRenderItem<FlatItem> = useCallback(
    ({ item, target }) => {
      if (item.type === 'header') {
        return (
          <PhotosGroupHeader
            label={item.label}
            syncStatus={item.syncStatus}
            isSticky={target === 'StickyHeader'}
            stickyOpacity={target === 'StickyHeader' ? stickyOpacity : undefined}
          />
        );
      }
      return (
        <View style={styles.photoCell}>
          <PhotoItem
            item={item.photo}
            isSelectMode={isSelectMode}
            isSelected={selectedIds?.has(item.photo.id)}
            onPress={onPhotoPress}
            onLongPress={onPhotoLongPress}
          />
        </View>
      );
    },
    [isSelectMode, selectedIds, onPhotoPress, onPhotoLongPress, stickyOpacity],
  );

  return (
    <AnimatedFlashList
      data={items}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={NUM_COLUMNS}
      stickyHeaderIndices={headerIndices}
      getItemType={getItemType}
      overrideItemLayout={overrideItemLayout}
      extraData={extraData}
      ListHeaderComponent={ListHeaderComponent}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
      scrollEventThrottle={16}
    />
  );
};

const styles = StyleSheet.create({
  photoCell: {
    flex: 1,
    aspectRatio: 1,
    margin: 1,
  },
  content: {
    paddingBottom: 80,
  },
});

export default PhotosTimeline;
