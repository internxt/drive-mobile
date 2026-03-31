import { close, openHostApp } from 'expo-share-extension';
import { useCallback } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import { AppPaths } from '../navigation/AppLinks';
import { useShareExtension } from './hooks/useShareExtension.ios';
import { useShareUpload } from './hooks/useShareUpload';
import { DriveScreen } from './screens/DriveScreen';
import { NotSignedInScreen } from './screens/NotSignedInScreen';
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

const ShareExtensionView = ({
  photosToken,
  mnemonic,
  rootFolderId,
  bucket,
  bridgeUser,
  userId,
  files,
  images,
  videos,
}: ShareExtensionProps) => {
  const tailwind = useTailwind();
  const { sdkReady, sharedFiles } = useShareExtension({
    photosToken,
    mnemonic,
    bucket,
    bridgeUser,
    userId,
    files,
    images,
    videos,
  });
  const {
    status: uploadStatus,
    errorType: uploadErrorType,
    uploadError,
    progress: uploadProgress,
    thumbnailUri,
    collisionState,
    uploadFiles,
    handleCollisionAction,
    reset: resetUpload,
  } = useShareUpload();

  const handleSave = useCallback(
    (destinationFolderUuid: string, renamedFileName?: string) => {
      if (!mnemonic || !bucket || !bridgeUser || !userId || !photosToken) return;
      uploadFiles(sharedFiles, destinationFolderUuid, { bridgeUser, userId, mnemonic, bucket }, renamedFileName);
    },
    [mnemonic, bucket, bridgeUser, userId, photosToken, sharedFiles, uploadFiles],
  );

  const handleViewInFolder = useCallback((folderUuid: string) => {
    openHostApp(AppPaths.driveFolder(folderUuid));
    close();
  }, []);

  if (!photosToken) {
    return <NotSignedInScreen onClose={close} onOpenLogin={() => openHostApp(AppPaths.signIn())} />;
  }

  if (!sdkReady || !rootFolderId) {
    return (
      <View style={tailwind('flex-1 items-center justify-center bg-white')}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <DriveScreen
      sharedFiles={sharedFiles}
      rootFolderUuid={rootFolderId}
      uploadStatus={uploadStatus}
      uploadErrorType={uploadErrorType}
      uploadError={uploadError}
      uploadProgress={uploadProgress}
      thumbnailUri={thumbnailUri}
      collisionState={collisionState}
      onClose={close}
      onSave={handleSave}
      onViewInFolder={handleViewInFolder}
      onDismissError={resetUpload}
      onCollisionAction={handleCollisionAction}
    />
  );
};

export default ShareExtensionView;
