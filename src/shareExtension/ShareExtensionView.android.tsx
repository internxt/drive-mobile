import { useCallback } from 'react';
import { ActivityIndicator, Linking, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from 'tailwind-rn';
import { AppLinks } from '../navigation/AppLinks';
import errorService from '../services/ErrorService';
import { RootStackScreenProps } from '../types/navigation';
import { useShareExtension } from './hooks/useShareExtension.android';
import { useShareUpload } from './hooks/useShareUpload';
import { DriveScreen } from './screens/DriveScreen';
import { NotSignedInScreen } from './screens/NotSignedInScreen';
import { colors } from './theme';

const ShareExtensionView = ({ navigation, route }: RootStackScreenProps<'AndroidShare'>) => {
  const tailwind = useTailwind();
  const { status, rootFolderUuid, sharedFiles, mnemonic, bucket, bridgeUser, userId } = useShareExtension(
    route.params?.files ?? [],
  );
  const {
    status: uploadStatus,
    errorType: uploadError,
    progress: uploadProgress,
    thumbnailUri,
    uploadFiles,
    reset: resetUpload,
  } = useShareUpload();

  const handleClose = useCallback(() => navigation.goBack(), [navigation]);
  const handleOpenLogin = useCallback(() => navigation.navigate('SignIn'), [navigation]);

  const handleSave = useCallback(
    (destinationFolderUuid: string, renamedFileName?: string) => {
      if (!mnemonic || !bucket || !bridgeUser || !userId) return;
      uploadFiles(sharedFiles, destinationFolderUuid, { bridgeUser, userId, mnemonic, bucket }, renamedFileName);
    },
    [mnemonic, bucket, bridgeUser, userId, sharedFiles, uploadFiles],
  );

  const handleViewInFolder = useCallback(
    (folderUuid: string) => {
      Linking.openURL(AppLinks.driveFolder(folderUuid)).catch((error) =>
        errorService.reportError(error, { extra: { folderUuid, message: 'Failed to open folder in host app' } }),
      );
      navigation.goBack();
    },
    [navigation],
  );

  if (status === 'unauthenticated') {
    return (
      <SafeAreaView style={tailwind('flex-1 bg-white')}>
        <NotSignedInScreen onClose={handleClose} onOpenLogin={handleOpenLogin} />
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

export default ShareExtensionView;
