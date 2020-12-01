import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, StatusBar, View } from 'react-native';
import { Provider } from 'react-redux'
import { store } from './src/store'
import AppNavigator from "./src/AppNavigator";
import { loadFonts } from './src/helpers'

export default function App() {
  const [appInitialized, setAppInitialized] = useState(false);

  Promise.all([
    loadFonts()
  ]).then(() => {
    setAppInitialized(true);
  })

  return <Provider store={store}>
    {appInitialized ?
      <View style={styles.appContainer}>
        <StatusBar backgroundColor={'#fff'} barStyle={'dark-content'} />
        <AppNavigator />
      </View>
      : <View style={styles.container}>
        <ActivityIndicator color={'#00f'} />
      </View>
    }
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
  },
});
