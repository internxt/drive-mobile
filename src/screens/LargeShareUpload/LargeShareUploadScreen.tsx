import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo } from 'react';
import { ActivityIndicator, Alert, Linking, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppGroupPendingShareService } from 'src/services/AppGroupPendingShareService';
import errorService from 'src/services/ErrorService';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../assets/lang/strings';
import { AppLinks } from '../../navigation/AppLinks';
import { useShareAuth } from '../../shareExtension/hooks/useShareAuth';
import { useShareUpload } from '../../shareExtension/hooks/useShareUpload';
import { DriveScreen } from '../../shareExtension/screens/DriveScreen';
import { NotSignedInScreen } from '../../shareExtension/screens/NotSignedInScreen';
import { colors } from '../../shareExtension/theme';
import { SharedFile } from '../../shareExtension/types';
import { RootStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'LargeShareUpload'>;

export const LargeShareUploadScreen = ({ route, navigation }: Props): JSX.Element => {
  const tailwind = useTailwind();
  const { metadata } = route.params;

  const { status, rootFolderUuid, mnemonic, bucket, bridgeUser, userId } = useShareAuth();
  const {
    status: uploadStatus,
    errorType: uploadError,
    progress: uploadProgress,
    thumbnailUri,
    uploadFiles,
    reset: resetUpload,
  } = useShareUpload({ skipSizeCheck: true });

  const sharedFiles = useMemo<SharedFile[]>(
    () =>
      metadata.files.map((file) => ({
        uri: file.uri,
        fileName: file.name,
        mimeType: null,
        size: file.size,
        phAssetId: file.phAssetId,
      })),
    [metadata.files],
  );

  useEffect(() => {
    if (uploadStatus === 'success') {
      AppGroupPendingShareService.clear().catch((error) =>
        errorService.reportError(error, { extra: { message: 'Failed to clear pending share after success' } }),
      );
    }
  }, [uploadStatus]);

  const handleClose = useCallback(() => {
    if (uploadStatus === 'uploading') return;
    if (uploadStatus === 'success') {
      navigation.goBack();
      return;
    }
    const shareExtensionTranslations = strings.screens.ShareExtension;
    Alert.alert(shareExtensionTranslations.cancelUploadTitle, shareExtensionTranslations.cancelUploadMessage, [
      { text: shareExtensionTranslations.cancelUploadNo, style: 'cancel' },
      {
        text: shareExtensionTranslations.cancelUploadConfirm,
        style: 'destructive',
        onPress: async () => {
          await AppGroupPendingShareService.clear().catch((error) =>
            errorService.reportError(error, { extra: { message: 'Failed to clear pending share on cancel' } }),
          );
          navigation.goBack();
        },
      },
    ]);
  }, [navigation, uploadStatus]);

  const handleOpenLogin = useCallback(() => navigation.navigate('SignIn'), [navigation]);

  const handleSave = useCallback(
    (destinationFolderUuid: string, renamedFileName?: string) => {
      if (!mnemonic || !bucket || !bridgeUser || !userId) {
        errorService.reportError(new Error('handleSave called with missing credentials'));
        return;
      }
      uploadFiles(sharedFiles, destinationFolderUuid, { bridgeUser, userId, mnemonic, bucket }, renamedFileName);
    },
    [mnemonic, bucket, bridgeUser, userId, sharedFiles, uploadFiles],
  );

  const handleViewInFolder = useCallback(
    async (folderUuid: string) => {
      await Linking.openURL(AppLinks.driveFolder(folderUuid)).catch((error) =>
        errorService.reportError(error, {
          extra: { folderUuid, message: 'Failed to open folder after large share upload' },
        }),
      );
      navigation.goBack();
    },
    [navigation],
  );

  if (status === 'unauthenticated') {
    return (
      <SafeAreaView style={tailwind('flex-1 bg-white')}>
        <NotSignedInScreen onClose={() => navigation.goBack()} onOpenLogin={handleOpenLogin} />
      </SafeAreaView>
    );
  }

  if (status === 'loading' || !rootFolderUuid) {
    return (
      <SafeAreaView style={tailwind('flex-1 bg-white')}>
        <View style={tailwind('flex-1 items-center justify-center')}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tailwind('flex-1 bg-white')}>
      <DriveScreen
        sharedFiles={sharedFiles}
        rootFolderUuid={rootFolderUuid}
        uploadStatus={uploadStatus}
        uploadError={uploadError}
        uploadProgress={uploadProgress}
        thumbnailUri={thumbnailUri}
        onClose={handleClose}
        onSave={handleSave}
        onViewInFolder={handleViewInFolder}
        onDismissError={resetUpload}
      />
    </SafeAreaView>
  );
};
