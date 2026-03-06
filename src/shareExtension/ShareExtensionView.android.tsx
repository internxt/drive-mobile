import { useCallback } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from 'tailwind-rn';
import { RootStackScreenProps } from '../types/navigation';
import { useShareExtension } from './hooks/useShareExtension.android';
import { DriveScreen } from './screens/DriveScreen';
import { NotSignedInScreen } from './screens/NotSignedInScreen';
import { colors } from './theme';

const ShareExtensionView = ({ navigation, route }: RootStackScreenProps<'AndroidShare'>) => {
  const tailwind = useTailwind();
  const { status, rootFolderUuid, sharedFiles } = useShareExtension(route.params?.files ?? []);

  const handleClose = useCallback(() => navigation.goBack(), [navigation]);
  const handleOpenLogin = useCallback(() => navigation.navigate('SignIn'), [navigation]);
  const handleSave = useCallback(() => {
    //upload logic
  }, []);

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
        onClose={handleClose}
        onSave={handleSave}
      />
    </SafeAreaView>
  );
};

export default ShareExtensionView;
