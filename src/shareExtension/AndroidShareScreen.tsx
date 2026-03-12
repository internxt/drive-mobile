import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import strings from '../../assets/lang/strings';
import asyncStorageService from '../services/AsyncStorageService';
import { AsyncStorageKey } from '../types';
import { RootStackScreenProps } from '../types/navigation';
import { useShareAuth } from './hooks/useShareAuth.android';
import { NotSignedInScreen } from './screens/NotSignedInScreen';

interface DebugInfo {
  userEmail: string | null;
  photosToken: string | null;
  mnemonic: string | null;
}

const AndroidShareScreen = ({ navigation, route }: RootStackScreenProps<'AndroidShare'>) => {
  const tailwind = useTailwind();
  const authStatus = useShareAuth();
  const [debug, setDebug] = useState<DebugInfo>({ userEmail: null, photosToken: null, mnemonic: null });

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    Promise.all([asyncStorageService.getUser(), asyncStorageService.getItem(AsyncStorageKey.PhotosToken)]).then(
      ([user, photosToken]) => {
        setDebug({
          userEmail: user?.email ?? null,
          photosToken,
          mnemonic: user?.mnemonic ?? null,
        });
      },
    );
  }, [authStatus]);

  if (authStatus === 'loading') {
    return (
      <View style={tailwind('flex-1 items-center justify-center bg-white')}>
        <ActivityIndicator size="large" color="#0066FF" />
      </View>
    );
  }

  if (authStatus === 'unauthenticated') {
    return <NotSignedInScreen onClose={() => navigation.goBack()} onOpenLogin={() => navigation.navigate('SignIn')} />;
  }

  const translations = strings.screens.ShareExtension;
  const files = route.params?.files ?? [];

  return (
    <View style={tailwind('flex-1 bg-white')}>
      <View style={tailwind('flex-row items-center justify-between px-4 pt-4 pb-3 border-b border-gray-20')}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={tailwind('w-8 h-8 items-center justify-center')}>
          <Text style={tailwind('text-lg text-gray-50')}>✕</Text>
        </TouchableOpacity>
        <Text style={[tailwind('text-base text-gray-100'), styles.semibold]}>{translations.title}</Text>
        <View style={tailwind('w-8 h-8')} />
      </View>

      {debug.userEmail ? (
        <View style={[tailwind('px-4 py-2'), styles.blueSection]}>
          <Text style={tailwind('text-xs text-gray-50 mb-0.5')}>Signed in as</Text>
          <Text style={[tailwind('text-sm text-primary'), styles.semibold]}>{debug.userEmail}</Text>
        </View>
      ) : null}
      {debug.photosToken ? (
        <View style={[tailwind('px-4 py-2'), styles.blueSection]}>
          <Text style={tailwind('text-xs text-gray-50 mb-0.5')}>Signed new token</Text>
          <Text style={[tailwind('text-sm text-primary'), styles.semibold]}>{debug.photosToken}</Text>
        </View>
      ) : null}
      {debug.mnemonic ? (
        <View style={[tailwind('px-4 py-2'), styles.blueSection]}>
          <Text style={tailwind('text-xs text-gray-50 mb-0.5')}>Signed in with mnemonic</Text>
          <Text style={[tailwind('text-sm text-primary'), styles.semibold]}>{debug.mnemonic}</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={tailwind('p-4')}>
        {files.map((file) => {
          const name = file.fileName ?? file.uri.split('/').pop() ?? file.uri;
          return (
            <View key={file.uri} style={tailwind('bg-gray-5 rounded-lg p-3 border border-gray-20 mb-2')}>
              <Text style={tailwind('text-sm text-gray-60')} numberOfLines={1}>
                {name}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  semibold: { fontWeight: '600' },
  blueSection: {
    backgroundColor: 'rgba(0,102,255,0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,102,255,0.2)',
  },
});

export default AndroidShareScreen;
