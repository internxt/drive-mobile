import { WarningCircleIcon, XIcon } from 'phosphor-react-native';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../assets/lang/strings';
import { colors, fontStyles } from '../theme';
import { UploadErrorType, UploadProgress, UploadStatus } from '../types';
import { formatBytes } from '../utils';

interface UploadFeedbackProps {
  status: UploadStatus;
  errorType: UploadErrorType | null;
  progress?: UploadProgress | null;
  onDismissError?: () => void;
}

function getErrorMessage(errorType: UploadErrorType | null): string {
  const s = strings.screens.ShareExtension;
  switch (errorType) {
    case 'no_internet':
      return s.errorNoInternet;
    case 'session_expired':
      return s.errorSessionExpired;
    case 'prep_failed':
      return s.errorPrep;
    case 'file_too_large':
      return s.errorFileTooLarge;
    default:
      return s.errorGeneral;
  }
}

const PROGRESS_UPDATE_MIN_DELTA = 0.01;

export const UploadFeedback = ({ status, errorType, progress, onDismissError }: UploadFeedbackProps) => {
  const tailwind = useTailwind();
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
      <View style={[tailwind('mx-4 rounded-xl'), styles.uploadingBg, { overflow: 'hidden' }]}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.progressBar,
            {
              width: progressBarAnimation.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            },
          ]}
        />
        <View style={tailwind('flex-row items-center px-4 py-3')}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[tailwind('ml-2 text-sm'), fontStyles.medium, { color: colors.primary }]}>
            {shouldShowFileCounter
              ? `${progress.currentFile} / ${progress.totalFiles}`
              : strings.screens.ShareExtension.uploading}
          </Text>
          <View style={{ flex: 1 }} />
          {shouldShowBytesProgress && (
            <Text style={[tailwind('text-sm'), fontStyles.medium, { color: colors.primary, textAlign: 'right' }]}>
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
      <View style={[tailwind('flex-row items-center px-4 py-3 mx-4 rounded-xl'), styles.errorBg]}>
        <WarningCircleIcon size={20} color={colors.red} weight="fill" />
        <Text style={[tailwind('ml-2 text-sm flex-1'), fontStyles.medium, styles.errorText]}>
          {getErrorMessage(errorType)}
        </Text>
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

const styles = StyleSheet.create({
  uploadingBg: {
    backgroundColor: colors.primaryBg,
  },
  progressBar: {
    backgroundColor: colors.primaryBgStrong,
  },
  errorBg: {
    backgroundColor: colors.redBg,
    borderColor: colors.redBorder,
    borderWidth: 1,
  },
  errorText: {
    color: colors.gray100,
  },
});
