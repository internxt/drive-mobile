import React, { useEffect, useState } from 'react';
import { Linking, View, Alert, ActivityIndicator } from 'react-native';
import { getHeaders } from '../../helpers/headers';
import { WebView } from 'react-native-webview'
import { connect } from 'react-redux';

interface OutOfSpaceProps {
  navigation?: any
  authenticationState?: any
}

function StorageWebView(props: OutOfSpaceProps) {

  const [isloading, setIsLoading] = useState(true)
  const [uri, setUri] = useState('')
  const { plan } = props.navigation.state.params
  const user = {
    id: props.authenticationState.user.userId,
    token: props.authenticationState.token
  }
  const STRIPE = {
    PLAN_NAME: plan.id,
    SUCCESS_URL: `${process.env.REACT_NATIVE_API_URL}/checkout/ok`,
    CANCELED_URL: `${process.env.REACT_NATIVE_API_URL}/checkout/cancel`
  }

  useEffect(() => {
    getLink()
  }, [])

  const getLink = () => {
    const body = {
      plan: STRIPE.PLAN_NAME,
      test: process.env.NODE_ENV === 'development',
      isMobile: true
    };

    fetch(`${process.env.REACT_NATIVE_API_URL}/api/stripe/session${(process.env.NODE_ENV === 'development' ? '?test=true' : '')}`, {
      method: 'POST',
      headers: getHeaders(user.token),
      body: JSON.stringify(body)
    }).then(result => result.json()).then(result => {
      if (result.error) {
        throw Error(result.error);
      }
      const link = `${process.env.REACT_NATIVE_API_URL}/checkout/${result.id}`

      Linking.openURL(link)
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
    <View>
      <WebView source={{ uri: uri }} />
    </View>
  )
}

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(StorageWebView);
