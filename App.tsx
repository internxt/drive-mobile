import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, Platform, Linking, Alert, SafeAreaView } from 'react-native';
import { Provider } from 'react-redux'
import { store } from './src/store'
import AppNavigator from './src/AppNavigator';
import { analyticsSetup, loadEnvVars, loadFonts, trackStackScreen } from './src/helpers'
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { fileActions } from './src/redux/actions';
import ReceiveSharingIntent from 'react-native-receive-sharing-intent';
import Toast from 'react-native-toast-message';
import * as Unicons from '@iconscout/react-native-unicons'
import { tailwind } from './src/helpers/designSystem';
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

  // useEffect to receive shared file
  useEffect(() => {
    if (Platform.OS === 'ios') {
      const regex = /inxt:\/\//g

      Linking.addEventListener('url', handleOpenURL);

      Linking.getInitialURL().then(res => {
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
          style={styles.appContainer}>

          <AppNavigator />
        </SafeAreaView>
        : <SafeAreaView style={styles.container}>
          {loadError ? <Text>{loadError}</Text> : null}
        </SafeAreaView>
      }
    </NavigationContainer>
    <Toast config={toastConfig} ref={(ref) => Toast.setRef(ref)} />
  </Provider>;
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1
  },
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center'
  }
})

const toastConfig = {
  success: function successToast({ text1, props, ...rest }) {
    return <View style={{
      backgroundColor: '#091E42',
      display: 'flex',
      width: '90%',
      height: 60,
      borderRadius: 6,
      flexDirection: 'row',
      padding: 15,
      alignItems: 'center'
    }}>
      <View>
        <Unicons.UilCheckCircle color="#42BE65" size={24} />
      </View>
      <View style={{ flexGrow: 1, marginLeft: 20 }}>
        <Text style={tailwind('text-white')}>{text1}</Text>
      </View>
    </View>
  },
  error: function errorToast({ text1, props, ...rest }) {
    return <View style={{
      backgroundColor: '#DA1E28',
      display: 'flex',
      width: '90%',
      height: 60,
      borderRadius: 6,
      flexDirection: 'row',
      padding: 15,
      alignItems: 'center'
    }}>
      <View>
        <Unicons.UilTimesCircle color="#FFFFFF" size={24} />
      </View>
      <View style={{ flexGrow: 1, marginLeft: 20 }}>
        <Text style={tailwind('text-white')}>{text1}</Text>
      </View>
    </View>
  },
  warn: function warnToast({ text1, props, ...rest }) {
    return <View style={{
      backgroundColor: '#F1C21B',
      display: 'flex',
      width: '90%',
      height: 60,
      borderRadius: 6,
      flexDirection: 'row',
      padding: 15,
      alignItems: 'center'
    }}>
      <View>
        <Unicons.UilExclamationTriangle color="#091E42" size={24} />
      </View>
      <View style={{ flexGrow: 1, marginLeft: 20 }}>
        <Text style={{ color: '#091E42' }}>{text1}</Text>
      </View>
    </View>
  }
};