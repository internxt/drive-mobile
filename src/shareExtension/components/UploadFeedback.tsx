import { WarningCircleIcon, XIcon } from 'phosphor-react-native';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Text, TouchableOpacity, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../assets/lang/strings';
import { fontStyles, useShareColors } from '../theme';
import { UploadProgress, UploadStatus } from '../types';
import { formatBytes } from '../utils';

interface UploadFeedbackProps {
  status: UploadStatus;
  errorMessage?: string | null;
  progress?: UploadProgress | null;
  onDismissError?: () => void;
}

const PROGRESS_UPDATE_MIN_DELTA = 0.01;

export const UploadFeedback = ({ status, errorMessage, progress, onDismissError }: UploadFeedbackProps) => {
  const tailwind = useTailwind();
  const colors = useShareColors();
  const progressBarAnimation = useRef(new Animated.Value(0)).current;
  const previousFileIndexRef = useRef(0);
  const previousProgressPercentRef = useRef(0);

  useEffect(() => {
    if (status !== 'uploading' || !progress) {
      progressBarAnimation.setValue(0);
      return;
    }

    const hasUploadingFileChanged = progress.currentFile !== previousFileIndexRef.current;
    if (hasUploadingFileChanged) {
      previousFileIndexRef.current = progress.currentFile;
      previousProgressPercentRef.current = 0;
      progressBarAnimation.setValue(0);
    }

    const uploadPercent =
      progress.currentFileSize > 0 ? Math.min(progress.bytesUploaded / progress.currentFileSize, 1) : 0;

    const percentDiff = Math.abs(uploadPercent - previousProgressPercentRef.current);
    if (percentDiff < PROGRESS_UPDATE_MIN_DELTA) return;
    previousProgressPercentRef.current = uploadPercent;

    const progressAnimation = Animated.timing(progressBarAnimation, {
      toValue: uploadPercent,
      duration: 300,
      useNativeDriver: false,
    });
    progressAnimation.start();
    return () => progressAnimation.stop();
  }, [progress, status, progressBarAnimation]);

  if (status === 'uploading') {
    const shouldShowFileCounter = progress && progress.totalFiles > 1;
    const shouldShowBytesProgress = progress && progress.currentFileSize > 0;
    const isPreparingUpload = shouldShowBytesProgress && progress.bytesUploaded === 0;

    return (
      <View style={[tailwind('mx-4 rounded-xl overflow-hidden'), { backgroundColor: colors.primaryBg }]}>
        <Animated.View
          style={[
            { position: 'absolute', top: 0, bottom: 0, left: 0 },
            { backgroundColor: colors.primaryBgStrong },
            { width: progressBarAnimation.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
          ]}
        />
        <View style={tailwind('flex-row items-center px-4 py-3')}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[tailwind('ml-2 text-sm'), fontStyles.medium, { lineHeight: 20, color: colors.primary }]}>
            {shouldShowFileCounter
              ? `${progress.currentFile} / ${progress.totalFiles}`
              : strings.screens.ShareExtension.uploading}
          </Text>
          <View style={tailwind('flex-1')} />
          {shouldShowBytesProgress && (
            <Text style={[tailwind('text-sm text-right'), fontStyles.medium, { lineHeight: 20, color: colors.primary }]}>
              {isPreparingUpload
                ? strings.screens.ShareExtension.preparing
                : `${formatBytes(progress.bytesUploaded)} / ${formatBytes(progress.currentFileSize)}`}
            </Text>
          )}
        </View>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View
        style={[
          tailwind('flex-row items-center px-4 py-3 mx-4 rounded-xl border'),
          { backgroundColor: colors.redBg, borderColor: colors.redBorder },
        ]}
      >
        <WarningCircleIcon size={20} color={colors.red} weight="fill" />
        <Text style={[tailwind('ml-2 text-sm flex-1'), fontStyles.medium, { lineHeight: 20, color: colors.gray100 }]}>{errorMessage}</Text>
        {onDismissError && (
          <TouchableOpacity onPress={onDismissError} hitSlop={8} style={tailwind('ml-2')}>
            <XIcon size={16} color={colors.gray40} />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return null;
};
