import React, { useEffect, useState } from 'react';
import { View, Alert, ActivityIndicator, StyleSheet, Platform, BackHandler } from 'react-native';
import { getHeaders } from '../../helpers/headers';
import { WebView } from 'react-native-webview'
import { connect } from 'react-redux';
import Toast from 'react-native-simple-toast'

interface StorageWebView {
  navigation?: any
  authenticationState?: any
}

// TODO: OutOfSpaceProps is a bad name for this component
function StorageWebView(props: StorageWebView): JSX.Element {

  const [isloading, setIsLoading] = useState(true)
  const [uri, setUri] = useState('')
  const { plan } = props.navigation.state.params
  const user = {
    id: props.authenticationState.user.userId,
    token: props.authenticationState.token
  }
  let count = 0

  useEffect(() => {
    getLink()

    // BackHandler
    const backAction = () => {
      count++
      if (count < 2) {
        Toast.show('Try exiting again to go back')
      } else {
        props.navigation.replace('Storage')
      }

      setTimeout(() => {
        count = 0
      }, 4000);
      return true
    }

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction)

    return () => backHandler.remove()
  }, [])

  const getLink = async () => {
    const body = {
      plan: plan.id,
      test: process.env.NODE_ENV === 'development',
      SUCCESS_URL: `${process.env.REACT_NATIVE_API_URL}`,
      CANCELED_URL: `${process.env.REACT_NATIVE_API_URL}`,
      isMobile: true
    };

    fetch(`${process.env.REACT_NATIVE_API_URL}/api/stripe/session${(process.env.NODE_ENV === 'development' ? '?test=true' : '')}`, {
      method: 'POST',
      headers: await getHeaders(user.token),
      body: JSON.stringify(body)
    }).then(result => result.json()).then(result => {
      if (result.error) {
        throw Error(result.error);
      }
      const link = `${process.env.REACT_NATIVE_API_URL}/checkout/${result.id}`

      setIsLoading(false)
      setUri(link)

    }).catch(err => {
      Alert.alert('There has been an error', `${err.message}, please contact us.`, [
        {
          text: 'Go back',
          onPress: () => props.navigation.replace('Storage')
        }
      ])
    });
  }

  if (isloading) {
    return (
      <View><ActivityIndicator /></View>
    )
  }
  return (
    <View style={styles.container}>
      <WebView style={styles.webview} source={{ uri: uri }} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  webview: {
    marginTop: Platform.OS === 'ios' ? 30 : 0
  }
})

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(StorageWebView);
