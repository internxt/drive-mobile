import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Platform, Linking, Alert, SafeAreaView } from 'react-native';
import Portal from '@burstware/react-native-portal';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import ReceiveSharingIntent from 'react-native-receive-sharing-intent';
import Toast from 'react-native-toast-message';
import * as Unicons from '@iconscout/react-native-unicons';
import * as NavigationBar from 'expo-navigation-bar';

import { store } from './store';
import AppNavigator from './screens/AppNavigator';
import { analyticsSetup, trackStackScreen } from './services/analytics';
import { forceCheckUpdates, loadEnvVars, loadFonts, shouldForceUpdate } from './helpers';
import { getColor, tailwind } from './helpers/designSystem';
import { deviceStorage } from './services/asyncStorage';
import { authActions, authThunks } from './store/slices/auth';
import { storageActions } from './store/slices/storage';
import { appThunks } from './store/slices/app';
import { StatusBar } from 'react-native';

process.nextTick = setImmediate;

export default function App(): JSX.Element {
  const [isAppInitialized, setIsAppInitialized] = useState(false);
  const [loadError, setLoadError] = useState('');
  const prefix = 'inxt';
  const config = {
    screens: {
      Home: '/',
    },
  };
  const linking = {
    prefixes: [prefix],
    config: config,
  };
  const loadLocalUser = async () => {
    const token = await deviceStorage.getToken();
    const photosToken = await deviceStorage.getItem('photosToken');
    const user = await deviceStorage.getUser();

    if (token && photosToken && user) {
      store.dispatch(authActions.signIn({ token, photosToken, user }));

      store.dispatch(appThunks.initializeThunk());
    } else {
      store.dispatch(authThunks.signOutThunk());
    }
  };
  const handleOpenURL = (e: { url: string }) => {
    if (e.url) {
      if (e.url.match(/inxt:\/\/.*:\/*/g)) {
        const regex = /inxt:\/\//g;
        const uri = e;
        const finalUri = uri.url.replace(regex, '');

        store.dispatch(storageActions.setUri(finalUri));
      }
    }
  };

  // Initialize app
  useEffect(() => {
    if (!isAppInitialized) {
      Promise.all([loadFonts(), loadEnvVars(), analyticsSetup(), loadLocalUser()])
        .then(() => {
          setIsAppInitialized(true);
        })
        .catch((err: Error) => {
          setLoadError(err.message);
        });
    }

    shouldForceUpdate()
      .then((shouldForce) => {
        if (shouldForce && process.env.NODE_ENV === 'production') {
          forceCheckUpdates();
        }
      })
      .catch(() => undefined);
  }, []);

  // useEffect to receive shared file
  useEffect(() => {
    NavigationBar.setBackgroundColorAsync('#FFFFFF');

    if (Platform.OS === 'ios') {
      const regex = /inxt:\/\//g;

      Linking.addEventListener('url', handleOpenURL);

      Linking.getInitialURL().then((uri) => {
        if (uri) {
          // check if it's a file or it's an url redirect
          if (uri.match(/inxt:\/\/.*:\/*/g)) {
            const finalUri = uri.replace(regex, '');

            store.dispatch(storageActions.setUri(finalUri));
          }
        }
      });
    } else {
      // Receive the file from the intent using react-native-receive-sharing-intent
      ReceiveSharingIntent.getReceivedFiles(
        (files) => {
          const fileInfo = {
            fileUri: files[0].contentUri,
            fileName: files[0].fileName,
          };

          store.dispatch(storageActions.setUri(fileInfo));
          ReceiveSharingIntent.clearReceivedFiles();
          // files returns as JSON Array example
          //[{ filePath: null, text: null, weblink: null, mimeType: null, contentUri: null, fileName: null, extension: null }]
        },
        (error) => {
          Alert.alert('There was an error', error.message);
        },
        'inxt',
      );
    }
    return () => {
      Linking.removeEventListener('url', handleOpenURL);
    };
  }, []);

  const navigationRef = useNavigationContainerRef();
  const routeNameRef = useRef<string>();

  return (
    <SafeAreaView style={tailwind('flex-1')}>
      <StatusBar backgroundColor={'white'} barStyle="dark-content" />
      <Portal.Host>
        <NavigationContainer
          ref={navigationRef}
          onReady={() => {
            const currentRoute = navigationRef.getCurrentRoute();

            routeNameRef.current = currentRoute && currentRoute.name;
          }}
          onStateChange={(route) => {
            const previousRouteName = routeNameRef.current;
            const currentRouteName = navigationRef.getCurrentRoute()?.name;

            if (previousRouteName !== currentRouteName) {
              route && trackStackScreen(route, navigationRef.getCurrentRoute()?.params);
            }

            routeNameRef.current = currentRouteName;
          }}
          linking={linking}
          fallback={<View></View>}
          theme={{
            dark: false,
            colors: {
              primary: '#091e42' as string,
              background: '#FFFFFF' as string,
              card: '#FFFFFF' as string,
              border: '#091e42' as string,
              notification: '#091e42' as string,
              text: '#091e42' as string,
            },
          }}
        >
          {isAppInitialized ? (
            <AppNavigator />
          ) : (
            <View style={tailwind('items-center flex-1 justify-center')}>
              {loadError ? <Text>{loadError}</Text> : null}
            </View>
          )}
        </NavigationContainer>

        <Toast config={toastConfig} ref={(ref) => Toast.setRef(ref)} />
      </Portal.Host>
    </SafeAreaView>
  );
}

const toastConfig = {
  success: function successToast({ text1 }: any) {
    return (
      <View style={tailwind('flex flex-row items-center bg-blue-100 p-3 w-full h-16')}>
        <View>
          <Unicons.UilCheckCircle color={getColor('green-50')} size={24} />
        </View>
        <View style={tailwind('flex-grow ml-3')}>
          <Text style={tailwind('text-white')}>{text1}</Text>
        </View>
      </View>
    );
  },
  error: function errorToast({ text1 }: any) {
    return (
      <View style={tailwind('flex flex-row items-center bg-red-60 p-3 w-full h-16')}>
        <View>
          <Unicons.UilTimesCircle color={getColor('white')} size={24} />
        </View>
        <View style={tailwind('flex-grow ml-3')}>
          <Text style={tailwind('text-white')}>{text1}</Text>
        </View>
      </View>
    );
  },
  warn: function warnToast({ text1 }: any) {
    return (
      <View style={tailwind('flex flex-row items-center bg-yellow-30 p-3 w-full h-16')}>
        <View>
          <Unicons.UilExclamationTriangle color={getColor('neutral-900')} size={24} />
        </View>
        <View style={tailwind('flex-grow ml-3')}>
          <Text style={tailwind('text-neutral-900')}>{text1}</Text>
        </View>
      </View>
    );
  },
};
