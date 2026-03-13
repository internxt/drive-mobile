import { close, openHostApp } from 'expo-share-extension';
import { useCallback, useEffect, useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import { useShareExtension } from './hooks/useShareExtension.ios';
import { useShareUpload } from './hooks/useShareUpload';
import { DriveScreen } from './screens/DriveScreen';
import { NotSignedInScreen } from './screens/NotSignedInScreen';
import { isIosTotalSizeTooLargeForUpload } from './services/shareUploadService';
import { colors } from './theme';

interface ShareExtensionProps {
  photosToken?: string;
  mnemonic?: string;
  rootFolderId?: string;
  bucket?: string;
  bridgeUser?: string;
  userId?: string;
  files?: string[];
  images?: string[];
  videos?: string[];
  url?: string;
  text?: string;
}

const ShareExtensionView = (props: ShareExtensionProps) => {
  const tailwind = useTailwind();
  const { sdkReady, sharedFiles, mnemonic, bucket, bridgeUser, userId } = useShareExtension(props);
  const { status: uploadStatus, errorType: uploadError, progress: uploadProgress, uploadFiles } = useShareUpload();

  const filesTooLarge = useMemo(() => isIosTotalSizeTooLargeForUpload(sharedFiles), [sharedFiles]);

  const handleSave = useCallback(
    (destinationFolderUuid: string, renamedFileName?: string) => {
      if (!mnemonic || !bucket || !bridgeUser || !userId || !props.photosToken) return;
      uploadFiles(sharedFiles, destinationFolderUuid, { bridgeUser, userId, mnemonic, bucket }, renamedFileName);
    },
    [mnemonic, bucket, bridgeUser, userId, props.photosToken, sharedFiles, uploadFiles],
  );

  useEffect(() => {
    if (uploadStatus === 'success') {
      const timer = setTimeout(close, 1500);
      return () => clearTimeout(timer);
    }
  }, [uploadStatus]);

  if (!props.photosToken) {
    return <NotSignedInScreen onClose={close} onOpenLogin={() => openHostApp('sign-in')} />;
  }

  if (!sdkReady || !props.rootFolderId) {
    return (
      <View style={tailwind('flex-1 items-center justify-center bg-white')}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <DriveScreen
      sharedFiles={sharedFiles}
      rootFolderUuid={props.rootFolderId}
      uploadStatus={uploadStatus}
      uploadError={uploadError}
      uploadProgress={uploadProgress}
      filesTooLarge={filesTooLarge}
      onClose={close}
      onSave={handleSave}
    />
  );
};

export default ShareExtensionView;
