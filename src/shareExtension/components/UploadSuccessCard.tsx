import { CheckCircleIcon, FolderSimpleIcon, XIcon } from 'phosphor-react-native';
import { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import StackedFilesIconSvg from '../../../assets/icons/stacked-files.svg';
import strings from '../../../assets/lang/strings';
import { getFileTypeIcon } from '../../helpers/filetypes';
import { fontStyles, useShareColors } from '../theme';
import { SharedFile } from '../types';
import { formatBytes, getSharedFileExtension } from '../utils';

interface UploadSuccessCardProps {
  sharedFiles: SharedFile[];
  uploadedFileName: string;
  thumbnailUri?: string | null;
  uploadedCount?: number;
  onClose: () => void;
  onViewInFolder: () => void;
}

export const UploadSuccessCard = ({
  sharedFiles,
  uploadedFileName,
  thumbnailUri,
  uploadedCount,
  onClose,
  onViewInFolder,
}: UploadSuccessCardProps) => {
  const tailwind = useTailwind();
  const colors = useShareColors();
  const shareExtensionTrans = strings.screens.ShareExtension;
  const slideAnim = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
      speed: 10,
    }).start();
  }, [slideAnim]);

  const displayCount = uploadedCount ?? sharedFiles.length;
  const isSingleFile = displayCount === 1;
  const firstFile = sharedFiles[0];
  const fileExtension = firstFile ? getSharedFileExtension(firstFile) : '';
  const isImage = firstFile?.mimeType?.startsWith('image/') ?? false;
  const IconComponent = fileExtension ? getFileTypeIcon(fileExtension.toLowerCase()) : null;
  const imageUri = firstFile?.uri ?? null;
  const displayUri = thumbnailUri ?? (isImage ? imageUri : null);

  const totalSizeOrNull = sharedFiles.some((sharedFile) => sharedFile.size !== null)
    ? sharedFiles.reduce((totalSizeAcc, sharedFile) => totalSizeAcc + (sharedFile.size ?? 0), 0)
    : null;

  const fileName = isSingleFile
    ? uploadedFileName
    : strings.formatString(shareExtensionTrans.itemsUploaded, displayCount).toString();

  const formattedSize = totalSizeOrNull === null ? null : formatBytes(totalSizeOrNull);
  const sizeAndFormat = isSingleFile
    ? [formattedSize, fileExtension].filter(Boolean).join(' · ')
    : (formattedSize ?? '');

  const renderFilePreview = () => {
    if (isSingleFile && displayUri) {
      return <Image source={{ uri: displayUri }} style={tailwind('w-20 h-20')} resizeMode="cover" />;
    }
    if (isSingleFile && IconComponent) {
      return <IconComponent width={56} height={56} />;
    }
    return <StackedFilesIconSvg width={48} height={48} />;
  };

  return (
    <View style={styles.overlay}>
      <Animated.View
        style={[
          tailwind('pt-4 pb-8 px-5 items-center'),
          { borderTopLeftRadius: 16, borderTopRightRadius: 16, backgroundColor: colors.surface },
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={8}>
          <XIcon size={20} color={colors.gray60} />
        </TouchableOpacity>

        <View style={tailwind('items-center mb-4')}>
          <View style={[tailwind('w-20 h-20 rounded-2xl overflow-hidden items-center justify-center'), { backgroundColor: colors.gray5 }]}>
            {renderFilePreview()}
          </View>

          <Text
            style={[tailwind('mt-3 text-center'), fontStyles.regular, { fontSize: 16, lineHeight: 19.2, color: colors.gray100 }]}
            numberOfLines={2}
          >
            {fileName}
          </Text>
          {sizeAndFormat ? (
            <Text
              style={[tailwind('mt-0.5 text-center'), fontStyles.regular, { fontSize: 12, lineHeight: 14.4, color: colors.gray60 }]}
            >
              {sizeAndFormat}
            </Text>
          ) : null}
        </View>

        <View style={tailwind('flex-row items-center mb-2')}>
          <CheckCircleIcon size={20} color={colors.successGreen} weight="fill" />
          <Text style={[tailwind('ml-1'), fontStyles.semibold, { color: colors.gray100, fontSize: 20, lineHeight: 24 }]}>
            {shareExtensionTrans.uploadedTitle}
          </Text>
        </View>

        <Text
          style={[tailwind('text-center px-6 mb-6'), fontStyles.regular, { color: colors.gray60, fontSize: 14, lineHeight: 16.8 }]}
        >
          {shareExtensionTrans.uploadedSubtitle}
        </Text>

        <TouchableOpacity
          onPress={onViewInFolder}
          style={[tailwind('flex-row items-center justify-center rounded-xl py-3.5 px-6 w-full'), { backgroundColor: colors.primary }]}
          activeOpacity={0.85}
        >
          <FolderSimpleIcon size={18} color={colors.white} weight="regular" />
          <Text style={[tailwind('ml-2 text-base'), fontStyles.semibold, { lineHeight: 24, color: colors.white }]}>
            {shareExtensionTrans.viewInFolder}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  closeButton: {
    alignSelf: 'flex-start',
    padding: 4,
  },
});
