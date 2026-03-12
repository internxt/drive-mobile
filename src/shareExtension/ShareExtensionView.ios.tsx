import { close, openHostApp } from 'expo-share-extension';
import { ActivityIndicator, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import { useShareExtension } from './hooks/useShareExtension.ios';
import { DriveScreen } from './screens/DriveScreen';
import { NotSignedInScreen } from './screens/NotSignedInScreen';
import { colors } from './theme';

interface ShareExtensionProps {
  photosToken?: string;
  mnemonic?: string;
  rootFolderId?: string;
  bucket?: string;
  files?: string[];
  images?: string[];
  videos?: string[];
  url?: string;
  text?: string;
}

const ShareExtensionView = (props: ShareExtensionProps) => {
  const tailwind = useTailwind();
  const { sdkReady, sharedFiles } = useShareExtension(props);

  const handleSave = () => {
    // Upload logic
  };

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
      onClose={close}
      onSave={handleSave}
    />
  );
};

export default ShareExtensionView;
