import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Platform, Linking, Alert, SafeAreaView } from 'react-native';
import { Provider } from 'react-redux'
import { store } from './src/store'
import AppNavigator from './src/AppNavigator';
import { analyticsSetup, forceCheckUpdates, loadEnvVars, loadFonts, shouldForceUpdate, trackStackScreen } from './src/helpers'
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { fileActions } from './src/store/actions';
import ReceiveSharingIntent from 'react-native-receive-sharing-intent';
import Toast from 'react-native-toast-message';
import * as Unicons from '@iconscout/react-native-unicons'
import { getColor, tailwind } from './src/helpers/designSystem';
import strings from './assets/lang/strings'

process.nextTick = setImmediate;

export default function App(): JSX.Element {
  const [appInitialized, setAppInitialized] = useState(false);
  const [loadError, setLoadError] = useState('');

  Promise.all([
    loadFonts(),
    loadEnvVars(),
    analyticsSetup()
  ]).then(() => {
    setAppInitialized(true);
  }).catch((err: Error) => {
    setLoadError(err.message)
  })

  const prefix = 'inxt'
  const config = {
    screens: {
      Home: '/'
    }
  }

  const linking = {
    prefixes: [prefix],
    config: config
  }

  const handleOpenURL = (e) => {
    if (e.url) {
      if (e.url.match(/inxt:\/\/.*:\/*/g)) {
        const regex = /inxt:\/\//g
        const uri = e
        const finalUri = uri.url.replace(regex, '')

        store.dispatch(fileActions.setUri(finalUri))
      }
    }
  }

  shouldForceUpdate().then((shouldForce) => {
    if (shouldForce && process.env.NODE_ENV === 'production') {
      forceCheckUpdates();
    }
  }).catch(() => { });

  // useEffect to receive shared file
  useEffect(() => {
    if (Platform.OS === 'ios') {
      const regex = /inxt:\/\//g

      Linking.addEventListener('url', handleOpenURL);

      Linking.getInitialURL().then((res: any) => {
        if (res && !res.url) {
          const uri = res

          // check if it's a file or it's an url redirect
          if (uri.match(/inxt:\/\/.*:\/*/g)) {
            const finalUri = uri.replace(regex, '')

            store.dispatch(fileActions.setUri(finalUri))
          }
        }
      })
    } else {
      // Receive the file from the intent using react-native-receive-sharing-intent
      ReceiveSharingIntent.getReceivedFiles(files => {
        const fileInfo = {
          fileUri: files[0].contentUri,
          fileName: files[0].fileName
        }

        store.dispatch(fileActions.setUri(fileInfo))
        ReceiveSharingIntent.clearReceivedFiles()
        // files returns as JSON Array example
        //[{ filePath: null, text: null, weblink: null, mimeType: null, contentUri: null, fileName: null, extension: null }]
      }, (error) => {
        Alert.alert('There was an error', error.message)
      }, 'inxt')
    }
    return () => {
      Linking.removeEventListener('url', handleOpenURL)
    }
  }, [])

  const navigationRef = useNavigationContainerRef();
  const routeNameRef = useRef<string>();

  return <Provider store={store}>
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        const currentRoute = navigationRef.getCurrentRoute();

        routeNameRef.current = currentRoute && currentRoute.name
      }}
      onStateChange={(route) => {
        const previousRouteName = routeNameRef.current;
        const currentRouteName = navigationRef.getCurrentRoute().name;

        if (previousRouteName !== currentRouteName) {
          trackStackScreen(route, navigationRef.getCurrentRoute().params);
        }

        routeNameRef.current = currentRouteName;
      }}
      linking={linking}
      fallback={<Text>{strings.generic.loading}</Text>}>

      {appInitialized ?
        <SafeAreaView
          style={tailwind('flex-1')}>

          <AppNavigator />

        </SafeAreaView>
        : <SafeAreaView style={tailwind('items-center flex-1 justify-center')}>
          {loadError ? <Text>{loadError}</Text> : null}
        </SafeAreaView>
      }
    </NavigationContainer>
    <Toast config={toastConfig} ref={(ref) => Toast.setRef(ref)} />
  </Provider>;
}

const toastConfig = {
  success: function successToast({ text1, props, ...rest }) {
    return <View style={tailwind('flex flex-row items-center bg-blue-100 p-3 w-full h-16')}>
      <View>
        <Unicons.UilCheckCircle color={getColor('green-50')} size={24} />
      </View>
      <View style={tailwind('flex-grow ml-3')}>
        <Text style={tailwind('text-white')}>{text1}</Text>
      </View>
    </View>
  },
  error: function errorToast({ text1, props, ...rest }) {
    return <View style={tailwind('flex flex-row items-center bg-red-60 p-3 w-full h-16')}>
      <View>
        <Unicons.UilTimesCircle color={getColor('white')} size={24} />
      </View>
      <View style={tailwind('flex-grow ml-3')}>
        <Text style={tailwind('text-white')}>{text1}</Text>
      </View>
    </View>
  },
  warn: function warnToast({ text1, props, ...rest }) {
    return <View style={tailwind('flex flex-row items-center bg-yellow-30 p-3 w-full h-16')}>
      <View>
        <Unicons.UilExclamationTriangle color={getColor('neutral-900')} size={24} />
      </View>
      <View style={tailwind('flex-grow ml-3')}>
        <Text style={tailwind('text-neutral-900')}>{text1}</Text>
      </View>
    </View>
  }
};