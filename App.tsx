import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, StatusBar, View, Text } from 'react-native';
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

  store.dispatch(fileActions.setUri(props.fileUri))

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
});
