import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import { FolderIcon, getFileTypeIcon } from '../../helpers/filetypes';
import { colors, fontStyles } from '../theme';
import { DriveViewMode, ShareFileItem, ShareFolderItem } from '../types';
import { formatBytes, formatDate } from '../utils';

interface FileListItemProps {
  item: ShareFolderItem | ShareFileItem;
  isFolder: boolean;
  viewMode: DriveViewMode;
  onPress?: () => void;
}

export const FileListItem = ({ item, isFolder, viewMode, onPress }: FileListItemProps) => {
  const tailwind = useTailwind();
  const IconComponent = isFolder ? FolderIcon : getFileTypeIcon((item as ShareFileItem).type ?? '');
  const fileItem = isFolder ? null : (item as ShareFileItem);
  const fileSize = fileItem ? Number.parseInt(fileItem.size, 10) : Number.NaN;
  const fileSizeText = Number.isNaN(fileSize) ? '' : formatBytes(fileSize);

  if (viewMode === 'grid') {
    return (
      <TouchableOpacity
        style={[tailwind('w-1/3 items-center p-2'), !isFolder && styles.disabled]}
        onPress={isFolder ? onPress : undefined}
        disabled={!isFolder}
        activeOpacity={0.6}
      >
        <View style={tailwind('w-24 h-24 items-center justify-center mb-1.5')}>
          <IconComponent width={80} height={80} />
        </View>
        <Text style={[tailwind('text-sm text-gray-100 text-center'), fontStyles.regular]} numberOfLines={2}>
          {item.plainName}
        </Text>
        <Text style={[tailwind('text-xs text-gray-40 text-center mt-0.5'), fontStyles.regular]}>
          {formatDate(item.updatedAt)}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[tailwind('flex-row items-center pl-5 py-3'), styles.rowItem, !isFolder && styles.disabled]}
      onPress={isFolder ? onPress : undefined}
      disabled={!isFolder}
      activeOpacity={0.6}
    >
      <View style={tailwind('w-10 h-10 items-center justify-center mr-3')}>
        <IconComponent width={40} height={40} />
      </View>
      <View style={tailwind('flex-1')}>
        <Text style={[tailwind('text-base text-gray-100'), fontStyles.regular]} numberOfLines={1}>
          {item.plainName}
        </Text>
        <Text style={[tailwind('text-xs text-gray-40 mt-0.5'), fontStyles.regular]} numberOfLines={1}>
          {fileItem ? `${fileSizeText} · ${formatDate(item.updatedAt)}` : formatDate(item.updatedAt)}
        </Text>
      </View>
      <View style={styles.separator} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  rowItem: {
    paddingRight: 16,
  },
  disabled: {
    opacity: 0.4,
  },
  separator: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.gray10,
  },
});
