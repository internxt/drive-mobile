import { CaretLeftIcon, CaretRightIcon } from 'phosphor-react-native';
import { useCallback, useMemo } from 'react';
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useTailwind } from 'tailwind-rn';
import StackedFilesIconSvg from '../../../assets/icons/stacked-files.svg';
import strings from '../../../assets/lang/strings';
import { getFileTypeIcon } from '../../helpers/filetypes';
import { useBottomPanelAnimation } from '../hooks/useBottomPanelAnimation';
import { fontStyles, useShareColors } from '../theme';
import { SharedFile } from '../types';
import { formatBytes, getSharedFileExtension } from '../utils';
import { TextButton } from './TextButton';

interface BottomFilePanelProps {
  sharedFiles: SharedFile[];
  finalName: string;
  isRenaming: boolean;
  onStartRename: () => void;
  onChangeName: (name: string) => void;
  onEndRename: () => void;
}

const getFormats = (files: SharedFile[]): string => {
  const exts = new Set(files.map(getSharedFileExtension).filter(Boolean));
  if (exts.size === 0) return '';
  if (exts.size === 1) return [...exts][0] ?? '';
  return strings.screens.ShareExtension.multipleFormats;
};

const TAB_WIDTH = 44;
const PANEL_MARGIN = 16;
const HANDLE_ICON_SIZE = 16;

const StackedFilesIcon = () => <StackedFilesIconSvg width={48} height={48} style={{ marginRight: 12 }} />;

export const BottomFilePanel = ({
  sharedFiles,
  finalName,
  isRenaming,
  onStartRename,
  onChangeName,
  onEndRename,
}: BottomFilePanelProps) => {
  const tailwind = useTailwind();
  const colors = useShareColors();
  const { width: screenWidth } = useWindowDimensions();
  const { isCollapsed, keyboardBottom, slideAnimation, toggle } = useBottomPanelAnimation(isRenaming, screenWidth);

  const formats = useMemo(() => getFormats(sharedFiles), [sharedFiles]);
  const totalSize = useMemo(() => {
    const sum = sharedFiles.reduce((acc, file) => acc + (file.size ?? 0), 0);
    const hasAnySize = sharedFiles.some((file) => file.size !== null);
    return hasAnySize ? sum : null;
  }, [sharedFiles]);

  const containerStyle = useMemo(
    () => [
      styles.containerBase,
      {
        backgroundColor: colors.surface,
        borderColor: colors.gray10,
      },
    ],
    [colors],
  );

  const file = sharedFiles[0];
  const originalFileName = file?.fileName ?? '';
  const dotIndex = originalFileName.lastIndexOf('.');
  const fileExt = dotIndex > 0 ? originalFileName.slice(dotIndex) : '';
  const nameWithoutExt =
    fileExt && finalName.endsWith(fileExt) ? finalName.slice(0, finalName.length - fileExt.length) : finalName;

  const handleRenameChange = useCallback((name: string) => onChangeName(name + fileExt), [fileExt, onChangeName]);
  const handleEndRename = useCallback(() => {
    if (!nameWithoutExt.trim()) {
      onChangeName(originalFileName);
    }
    onEndRename();
  }, [nameWithoutExt, onChangeName, onEndRename, originalFileName]);

  if (sharedFiles.length === 0) return null;

  const collapseButton = (
    <TouchableOpacity
      onPress={toggle}
      style={[tailwind('items-center justify-center'), styles.collapseButton]}
      hitSlop={4}
    >
      {isCollapsed ? (
        <CaretLeftIcon size={HANDLE_ICON_SIZE} color={colors.gray40} />
      ) : (
        <CaretRightIcon size={HANDLE_ICON_SIZE} color={colors.gray40} />
      )}
    </TouchableOpacity>
  );

  const divider = <View style={[styles.dividerBase, { backgroundColor: colors.gray10 }]} />;

  const animatedStyle = { bottom: keyboardBottom, transform: [{ translateX: slideAnimation }] };

  if (sharedFiles.length > 1) {
    return (
      <Animated.View style={[tailwind('flex-row items-center'), ...containerStyle, animatedStyle]}>
        {collapseButton}
        {divider}
        <StackedFilesIcon />
        <View style={tailwind('flex-1')}>
          <Text style={[tailwind('text-sm'), fontStyles.medium, { color: colors.gray100 }]}>
            {strings.formatString(strings.screens.ShareExtension.itemsSelected, sharedFiles.length)}
          </Text>
          {totalSize !== null || formats ? (
            <Text style={[tailwind('text-xs mt-0.5'), fontStyles.regular, { color: colors.gray40 }]}>
              {[totalSize === null ? null : formatBytes(totalSize), formats || null].filter(Boolean).join(' · ')}
            </Text>
          ) : null}
        </View>
      </Animated.View>
    );
  }

  if (!file) return null;
  const ext = getSharedFileExtension(file);
  const IconComponent = getFileTypeIcon(ext.toLowerCase());
  const displayName = finalName || file.fileName;
  const isImage = file.mimeType?.startsWith('image/') ?? false;

  return (
    <Animated.View style={[tailwind('flex-row items-center'), ...containerStyle, animatedStyle]}>
      {collapseButton}
      {divider}
      <View style={tailwind('items-center justify-center mr-3 w-10 h-10')}>
        {isImage ? (
          <Image source={{ uri: file.uri }} style={styles.fileImage} resizeMode="cover" />
        ) : (
          <IconComponent width={36} height={36} />
        )}
      </View>
      <View style={tailwind('flex-1')}>
        {isRenaming ? (
          <TextInput
            style={[tailwind('text-sm p-0'), fontStyles.medium, styles.renameInputBase, { color: colors.gray100, borderBottomColor: colors.primary }]}
            value={nameWithoutExt}
            onChangeText={handleRenameChange}
            onBlur={handleEndRename}
            autoFocus
            selectTextOnFocus
            returnKeyType="done"
            onSubmitEditing={handleEndRename}
          />
        ) : (
          <Text
            style={[tailwind('text-sm'), fontStyles.medium, styles.fileNameText, { color: colors.gray100 }]}
            numberOfLines={1}
          >
            {displayName}
          </Text>
        )}
        <Text style={[tailwind('text-xs mt-0.5'), fontStyles.regular, { color: colors.gray40 }]}>
          {file.size === null ? ext : `${formatBytes(file.size)} · ${ext}`}
        </Text>
      </View>
      {!isRenaming && <TextButton title={strings.screens.ShareExtension.rename} onPress={onStartRename} />}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  containerBase: {
    position: 'absolute',
    marginHorizontal: PANEL_MARGIN,
    paddingHorizontal: PANEL_MARGIN,
    paddingVertical: 12,
    minHeight: 64,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 32 },
    shadowOpacity: 0.04,
    shadowRadius: 40,
    elevation: 8,
  },
  collapseButton: {
    width: TAB_WIDTH,
    alignSelf: 'stretch',
  },
  dividerBase: {
    width: 1,
    alignSelf: 'stretch',
    marginRight: 12,
  },
  fileImage: {
    width: 36,
    height: 36,
    borderRadius: 6,
  },
  fileNameText: {
    paddingRight: 8,
  },
  renameInputBase: {
    padding: 0,
    borderBottomWidth: 1,
  },
});
