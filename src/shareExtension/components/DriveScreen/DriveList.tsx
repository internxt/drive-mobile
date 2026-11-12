import { ReactNode, useCallback } from 'react';
import { FlatList, Keyboard, StyleProp, Text, View, ViewStyle } from 'react-native';
import DriveItemSkinSkeleton from 'src/components/DriveItemSkinSkeleton';
import strings from '../../../../assets/lang/strings';
import { fontStyles, useShareColors } from '../../theme';
import { DriveViewMode, ShareFileItem, ShareFolderItem } from '../../types';
import { FileListItem } from '../FileListItem';
import { TextButton } from '../TextButton';
import { cssInterop } from 'nativewind';

export type DriveListItem = { type: 'folder'; data: ShareFolderItem } | { type: 'file'; data: ShareFileItem };

const SKELETON_KEYS = Array.from({ length: 10 }, (_, i) => `skeleton-${i}`);

const FULL_SCREEN_MESSAGE_STYLE = { paddingTop: 48 };

const keyExtractor = (item: DriveListItem) => item.data.uuid;

interface DriveListMessageProps {
  message: string;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

const DriveListMessage = ({ message, style = FULL_SCREEN_MESSAGE_STYLE, children }: DriveListMessageProps) => {
  const colors = useShareColors();
  return (
    <View className="items-center" style={style}>
      <Text style={[{ fontSize: 16, color: colors.gray40 }, fontStyles.regular]}>{message}</Text>
      {children}
    </View>
  );
};

interface DriveListErrorProps {
  isSessionExpired: boolean;
  onRetry: () => void;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

const DriveListError = ({ isSessionExpired, onRetry, style }: DriveListErrorProps) => {
  const shareExtensionTexts = strings.screens.ShareExtension;
  return (
    <DriveListMessage
      message={isSessionExpired ? shareExtensionTexts.errorSessionExpired : shareExtensionTexts.folderLoadError}
      style={style}
    >
      {isSessionExpired ? null : <TextButton title={strings.buttons.tryAgain} onPress={onRetry} />}
    </DriveListMessage>
  );
};

interface DriveListProps {
  listData: DriveListItem[];
  viewMode: DriveViewMode;
  loading: boolean;
  loadingMore: boolean;
  searchQuery: string;
  bottomInset: number;
  hasLoadError: boolean;
  hasLoadMoreError: boolean;
  isSessionExpired: boolean;
  onRetry: () => void;
  onRetryLoadMore: () => void;
  onNavigate: (uuid: string, name: string) => void;
  onLoadMore: () => void;
}

export const DriveList = ({
  listData,
  viewMode,
  loading,
  loadingMore,
  searchQuery,
  bottomInset,
  hasLoadError,
  hasLoadMoreError,
  isSessionExpired,
  onRetry,
  onRetryLoadMore,
  onNavigate,
  onLoadMore,
}: DriveListProps) => {
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
      <View className="flex-1">
        {SKELETON_KEYS.map((key) => (
          <View className={`${viewMode === 'grid' ? '' : 'h-16'}`} key={key}>
            <DriveItemSkinSkeleton viewMode={viewMode} />
          </View>
        ))}
      </View>
    );
  }

  if (hasLoadError) {
    return <DriveListError isSessionExpired={isSessionExpired} onRetry={onRetry} />;
  }

  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View className="h-16">
          <DriveItemSkinSkeleton viewMode={viewMode} />
        </View>
      );
    }
    if (hasLoadMoreError) {
      return <DriveListError isSessionExpired={isSessionExpired} onRetry={onRetryLoadMore} className="py-6" />;
    }
    return null;
  };

  return (
    <FlatList
      key={`${viewMode}-${numColumns}`}
      data={listData}
      keyExtractor={keyExtractor}
      numColumns={numColumns}
      renderItem={renderItem}
      contentContainerClassName={`${viewMode === 'grid' ? 'px-2' : ''}`}
      contentContainerStyle={{ paddingBottom: bottomInset }}
      ListEmptyComponent={
        <DriveListMessage
          message={searchQuery ? strings.screens.ShareExtension.noResults : strings.screens.ShareExtension.emptyFolder}
        />
      }
      ListFooterComponent={renderFooter()}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.5}
      onScrollBeginDrag={Keyboard.dismiss}
    />
  );
};

cssInterop(DriveListError, { className: 'style' });
