import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, StatusBar, View, Text, Platform, Linking } from 'react-native';
import { Provider } from 'react-redux'
import { store } from './src/store'
import AppNavigator from './src/AppNavigator';
import { analyticsSetup, loadEnvVars, loadFonts } from './src/helpers'
import { NavigationContainer } from '@react-navigation/native';
import { fileActions } from './src/redux/actions';

export default function App(props: any): JSX.Element {
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
      FileExplorer: '/'
    }
  }

  const linking = {
    prefixes: [prefix],
    config: config
  }

  const handleOpenURL = (e) => {
    if (e.url) {
      if ( e.url.match(/inxt:\/\/.*:\/*/g) ) {
        const regex = /inxt:\/\//g
        const uri = e
        const finalUri = uri.url.replace(regex, '')

        console.log('(App.tsx) set uri if opened iOS', e)
        store.dispatch(fileActions.setUri(finalUri))
      } else { console.log('this also a deeplink fella')}
    }
  }

  useEffect(() => {
    // deep link => inxt://tumama
    // share to => inxt://file:///Users/internxt/Library/Developer/CoreSimulator/Devices/5238DEFF-AC91-43B6-AF4D-185C87891566/data/Containers/Shared/AppGroup/B4881A46-801E-4B64-8ED2-69A48EFBEF73/File%20Provider%20Storage/Downloads/a530838.pdf
    if(Platform.OS === 'ios'){
      const regex = /inxt:\/\//g

      Linking.addEventListener('url', handleOpenURL);

      Linking.getInitialURL().then(res => {
        if (res && !res.url) {
          const uri = res

          if ( uri.match(/inxt:\/\/.*:\/*/g) ) {
            const finalUri = uri.replace(regex, '')

            console.log('(App.tsx) set uri if closed iOS', res)
            store.dispatch(fileActions.setUri(finalUri))
          } else { console.log('this a deep link fella')}
        }
      })
    } else {
      console.log('(App.tsx) set uri Android')
      store.dispatch(fileActions.setUri(props.fileUri))
    }

    return () => Linking.removeEventListener('url', handleOpenURL)
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
            : <ActivityIndicator color={'#00f'} />}
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  }
})