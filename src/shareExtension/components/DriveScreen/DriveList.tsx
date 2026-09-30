import { ReactNode, useCallback } from 'react';
import { FlatList, Keyboard, Text, View } from 'react-native';
import DriveItemSkinSkeleton from 'src/components/DriveItemSkinSkeleton';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../../assets/lang/strings';
import { fontStyles, useShareColors } from '../../theme';
import { DriveViewMode, ShareFileItem, ShareFolderItem } from '../../types';
import { FileListItem } from '../FileListItem';
import { TextButton } from '../TextButton';

export type DriveListItem = { type: 'folder'; data: ShareFolderItem } | { type: 'file'; data: ShareFileItem };

const SKELETON_KEYS = Array.from({ length: 10 }, (_, i) => `skeleton-${i}`);

const keyExtractor = (item: DriveListItem) => item.data.uuid;

const DriveListMessage = ({ message, children }: { message: string; children?: ReactNode }) => {
  const tailwind = useTailwind();
  const colors = useShareColors();
  return (
    <View style={[tailwind('items-center'), { paddingTop: 48 }]}>
      <Text style={[{ fontSize: 16, color: colors.gray40 }, fontStyles.regular]}>{message}</Text>
      {children}
    </View>
  );
};

interface DriveListProps {
  listData: DriveListItem[];
  viewMode: DriveViewMode;
  loading: boolean;
  loadingMore: boolean;
  searchQuery: string;
  hasLoadError: boolean;
  onRetry: () => void;
  onNavigate: (uuid: string, name: string) => void;
  onLoadMore: () => void;
}

export const DriveList = ({
  listData,
  viewMode,
  loading,
  loadingMore,
  searchQuery,
  hasLoadError,
  onRetry,
  onNavigate,
  onLoadMore,
}: DriveListProps) => {
  const tailwind = useTailwind();
  const numColumns = viewMode === 'grid' ? 3 : 1;

  const renderItem = useCallback(
    ({ item: listItem }: { item: DriveListItem }) => {
      const isFolder = listItem.type === 'folder';
      const handleItemPress = isFolder ? () => onNavigate(listItem.data.uuid, listItem.data.plainName) : undefined;
      return <FileListItem item={listItem.data} isFolder={isFolder} viewMode={viewMode} onPress={handleItemPress} />;
    },
    [onNavigate, viewMode],
  );

  if (loading) {
    return (
      <View style={tailwind('flex-1')}>
        {SKELETON_KEYS.map((key) => (
          <View style={viewMode === 'grid' ? undefined : tailwind('h-16')} key={key}>
            <DriveItemSkinSkeleton viewMode={viewMode} />
          </View>
        ))}
      </View>
    );
  }

  if (hasLoadError) {
    return (
      <DriveListMessage message={strings.screens.ShareExtension.folderLoadError}>
        <TextButton title={strings.screens.ShareExtension.retry} onPress={onRetry} />
      </DriveListMessage>
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
        <DriveListMessage
          message={searchQuery ? strings.screens.ShareExtension.noResults : strings.screens.ShareExtension.emptyFolder}
        />
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
