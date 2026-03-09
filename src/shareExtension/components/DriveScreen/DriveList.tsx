import { useCallback } from 'react';
import { FlatList, Keyboard, Text, View } from 'react-native';
import DriveItemSkinSkeleton from 'src/components/DriveItemSkinSkeleton';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../../assets/lang/strings';
import { fontStyles } from '../../theme';
import { DriveViewMode, ShareFileItem, ShareFolderItem } from '../../types';
import { FileListItem } from '../FileListItem';

export type DriveListItem = { type: 'folder'; data: ShareFolderItem } | { type: 'file'; data: ShareFileItem };

const keyExtractor = (item: DriveListItem) => item.data.uuid;

interface DriveListProps {
  listData: DriveListItem[];
  viewMode: DriveViewMode;
  loading: boolean;
  loadingMore: boolean;
  searchQuery: string;
  onNavigate: (uuid: string, name: string) => void;
  onLoadMore: () => void;
}

export const DriveList = ({
  listData,
  viewMode,
  loading,
  loadingMore,
  searchQuery,
  onNavigate,
  onLoadMore,
}: DriveListProps) => {
  const tailwind = useTailwind();
  const numColumns = viewMode === 'grid' ? 3 : 1;

  const renderItem = useCallback(
    ({ item }: { item: DriveListItem }) => {
      const isFolder = item.type === 'folder';
      const handleItemPress = isFolder ? () => onNavigate(item.data.uuid, item.data.plainName) : undefined;
      return <FileListItem item={item.data} isFolder={isFolder} viewMode={viewMode} onPress={handleItemPress} />;
    },
    [onNavigate, viewMode],
  );

  if (loading) {
    return (
      <View style={tailwind('flex-1')}>
        {Array.from({ length: 10 }).map((_, i) => (
          <View style={viewMode === 'grid' ? undefined : tailwind('h-16')} key={i}>
            <DriveItemSkinSkeleton viewMode={viewMode} />
          </View>
        ))}
      </View>
    );
  }

  return (
    <FlatList
      key={`${viewMode}-${numColumns}`}
      data={listData}
      keyExtractor={keyExtractor}
      numColumns={numColumns}
      renderItem={renderItem}
      contentContainerStyle={viewMode === 'grid' ? tailwind('px-2') : undefined}
      ListEmptyComponent={
        <View style={[tailwind('items-center'), { paddingTop: 48 }]}>
          <Text style={[tailwind('text-gray-40'), { fontSize: 16, ...fontStyles.regular }]}>
            {searchQuery ? strings.screens.ShareExtension.noResults : strings.screens.ShareExtension.emptyFolder}
          </Text>
        </View>
      }
      ListFooterComponent={
        loadingMore ? (
          <View style={tailwind('h-16')}>
            <DriveItemSkinSkeleton viewMode={viewMode} />
          </View>
        ) : null
      }
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.5}
      onScrollBeginDrag={Keyboard.dismiss}
    />
  );
};
