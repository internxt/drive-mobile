import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { ActivityIndicator, processColor, StyleSheet, Text, View } from 'react-native';
import { Provider } from 'react-redux'
import { store } from './src/store'
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
      <View style={styles.container}>
        <Text>Open up App.tsx to start working on your app!</Text>
        <StatusBar style="auto" />
      </View>
      : <View style={styles.container}>
        <ActivityIndicator color={'#00f'} />
      </View>
    }
  </Provider>
    ;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
