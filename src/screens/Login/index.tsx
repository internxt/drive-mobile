import React, { useEffect } from 'react'
import { useState } from 'react';
import { Image, View, Text, KeyboardAvoidingView, StyleSheet, Alert } from 'react-native';
import { TextInput, TouchableHighlight } from 'react-native-gesture-handler';
import { connect } from 'react-redux';
import { deviceStorage } from '../../helpers';
import analytics from '../../helpers/lytics';
import { normalize } from '../../helpers/normalize'
import { userActions } from '../../redux/actions';
import { Reducers } from '../../redux/reducers/reducers';
import { validate2FA, apiLogin } from './access';
interface LoginProps extends Reducers {
  goToForm?: (screenName: string) => void
  dispatch?: any
  navigation?: any
}

function Login(props: LoginProps): JSX.Element {
  const [isLoading, setIsLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [showTwoFactor, setShowTwoFactor] = useState(false)

  useEffect(() => {
    if (props.authenticationState.error) {
      Alert.alert('Login error', props.authenticationState.error)
    }
  }, [props.authenticationState])

  useEffect(() => {
    if (props.authenticationState.loggedIn === true) {
      const rootFolderId = props.authenticationState.user.root_folder_id;

      props.navigation.replace('FileExplorer', {
        folderId: rootFolderId
      })
    } else {
      (async () => {
        const xToken = await deviceStorage.getItem('xToken')
        const xUser = await deviceStorage.getItem('xUser')

        if (xToken && xUser) {
          props.dispatch(userActions.localSignIn(xToken, xUser))
        } else {
          setIsLoading(false)
        }
      })()
    }
  }, [props.authenticationState.loggedIn, props.authenticationState.token])

  return <KeyboardAvoidingView behavior="padding" style={styles.container}>
    <View style={[styles.containerCentered, isLoading ? styles.halfOpacity : {}]}>
      <View style={styles.containerHeader}>
        <View style={styles.flexRow}>
          <Image style={styles.logo} source={require('../../../assets/images/logo.png')} />
          <Text style={styles.title}>Sign in to Internxt</Text>
        </View>
        <View style={styles.buttonWrapper}>
          <TouchableHighlight
            style={[styles.button, styles.buttonOn]}
            underlayColor="#00aaff">
            <Text style={styles.buttonOnLabel}>Sign in</Text>
          </TouchableHighlight>

          <TouchableHighlight
            activeOpacity={1}
            style={[styles.button, styles.buttonOff]}
            underlayColor="#f2f2f2"
            onPress={() => props.navigation.replace('Register')}>
            <Text style={styles.buttonOffLabel}>Create account</Text>
          </TouchableHighlight>
        </View>
      </View>
      <View style={showTwoFactor ? styles.hideInputFieldWrapper : styles.showInputFieldsWrapper}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={email}
            autoCapitalize={'none'}
            onChangeText={value => setEmail(value)}
            placeholder="Email address"
            placeholderTextColor="#666"
            maxLength={64}
            keyboardType="email-address"
            textContentType="emailAddress"
          />
        </View>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={value => setPassword(value)}
            placeholder="Password"
            placeholderTextColor="#666"
            secureTextEntry={true}
            textContentType="password"
          />
        </View>
      </View>
      <View style={showTwoFactor ? styles.showInputFieldsWrapper : styles.hideInputFieldWrapper}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={[styles.input, validate2FA(twoFactorCode) ? {} : { borderWidth: 1, borderColor: '#f00' }]}
            value={twoFactorCode}
            onChangeText={value => setTwoFactorCode(value)}
            placeholder="Two-factor code"
            placeholderTextColor="#666"
            maxLength={64}
            keyboardType="numeric"
            textContentType="none" />
        </View>
      </View>
      <View style={styles.buttonFooterWrapper}>
        <TouchableHighlight
          style={[styles.button, styles.buttonBlock]}
          underlayColor="#4585f5"
          onPress={() => {
            setIsLoading(true)

            apiLogin(email).then(userLoginData => {
              if (userLoginData.tfa && !twoFactorCode) {
                setShowTwoFactor(true)
              } else {
                props.dispatch(userActions.signin(email, password, userLoginData.sKey, twoFactorCode))
              }
            }).catch(err => {
              analytics.track('user-signin-attempted', {
                status: 'error',
                message: err.message
              }).catch(() => { })

              Alert.alert(err.message)

            }).finally(() => {
              setIsLoading(false)
            })
          }}>
          <Text style={styles.buttonOnLabel}>{isLoading ? 'Decrypting...' : 'Sign in'}</Text>
        </TouchableHighlight>
        <Text style={styles.forgotPasswordText} onPress={() => props.navigation.replace('Forgot')}>Forgot your password?</Text>
      </View>
    </View>
    <Text style={styles.versionLabel}>Internxt Drive v1.2.2 (3)</Text>
  </KeyboardAvoidingView>
}

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(Login)

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: normalize(20),
    backgroundColor: '#FFFFFF'
  },
  containerCentered: {
    justifyContent: 'center',
    alignSelf: 'center',
    width: '100%',
    height: 600
  },
  containerHeader: {
  },
  logo: {
    marginTop: normalize(59),
    height: normalize(37),
    width: normalize(28),
    marginLeft: normalize(1)
  },
  title: {
    fontFamily: 'CerebriSans-Bold',
    fontSize: normalize(22),
    letterSpacing: -1.7,
    color: '#000',
    marginBottom: normalize(30),
    marginTop: normalize(64),
    marginLeft: normalize(7)
  },
  buttonWrapper: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: normalize(30)
  },
  buttonFooterWrapper: {
    marginTop: normalize(15)
  },
  button: {
    alignSelf: 'stretch',
    height: normalize(55),
    width: normalize(130),
    borderRadius: 3.4,
    backgroundColor: '#4585f5',
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonBlock: {
    width: '100%'
  },
  buttonOn: {
    backgroundColor: '#4585f5'
  },
  buttonOff: {
    backgroundColor: '#f2f2f2'
  },
  buttonOnLabel: {
    fontFamily: 'CerebriSans-Medium',
    fontSize: normalize(15),
    textAlign: 'center',
    color: '#fff'
  },
  buttonOffLabel: {
    fontFamily: 'CerebriSans-Medium',
    fontSize: normalize(15),
    textAlign: 'center',
    color: '#5c5c5c'
  },
  input: {
    fontFamily: 'CerebriSans-Medium',
    letterSpacing: -0.2,
    fontSize: normalize(15),
    color: '#000',
    flex: 1,
    paddingLeft: normalize(20)
  },
  showInputFieldsWrapper: {
    justifyContent: 'center'
  },
  hideInputFieldWrapper: {
    display: 'none'
  },
  inputWrapper: {
    height: normalize(55),
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#c9c9c9',
    justifyContent: 'center',
    marginBottom: normalize(13)
  },
  versionLabel: {
    fontFamily: 'CerebriSans-Regular',
    alignSelf: 'center',
    color: '#999999',
    marginTop: normalize(30),
    marginBottom: normalize(70)
  },
  forgotPasswordText: {
    marginTop: normalize(13),
    color: '#a4a4a4'
  },
  flexRow: {
    flexDirection: 'row'
  },
  halfOpacity: {
    opacity: 0.5
  }
});