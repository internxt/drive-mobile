import React, { useEffect, useState } from 'react';
import { StyleSheet, StatusBar, View, Text, Platform, Linking, Alert, Dimensions } from 'react-native';
import { Provider } from 'react-redux'
import { store } from './src/store'
import AppNavigator from './src/AppNavigator';
import { analyticsSetup, loadEnvVars, loadFonts } from './src/helpers'
import { NavigationContainer } from '@react-navigation/native';
import { fileActions } from './src/redux/actions';
import ReceiveSharingIntent from 'react-native-receive-sharing-intent';

export const DEVICE_WIDTH = Dimensions.get('window').width
export const DEVICE_HEIGHT = Dimensions.get('window').height

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
    if (Platform.OS === 'ios'){
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
      },
      (error) => {
        Alert.alert('There was an error', error)
      }, 'inxt' // share url protocol (must be unique to your app, suggest using your apple bundle id)
      )
    }
    return () => {
      Linking.removeEventListener('url', handleOpenURL)
    }
  }, [])

  return <Provider store={store}>
    <NavigationContainer linking={linking} fallback={<Text>Loading...</Text>}>
      {appInitialized ?
        <View style={styles.appContainer}>
          <StatusBar backgroundColor={'#fff'} barStyle={'dark-content'} />
          <AppNavigator />
        </View>
        : <View style={styles.container}>
          {loadError ? <Text>{loadError}</Text>
            : null}
        </View>
      }
    </NavigationContainer>
  </Provider>
  ;
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