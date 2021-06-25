import React, { useEffect } from 'react'
import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, StyleSheet, Alert } from 'react-native';
import { TextInput, TouchableHighlight, TouchableOpacity } from 'react-native-gesture-handler';
import { connect } from 'react-redux';
import strings from '../../../assets/lang/strings';
import { deviceStorage } from '../../helpers';
import analytics from '../../helpers/lytics';
import { normalize } from '../../helpers/normalize'
import { userActions } from '../../redux/actions';
import { AuthenticationState } from '../../redux/reducers/authentication.reducer';
import { Reducers } from '../../redux/reducers/reducers';
import { validate2FA, apiLogin } from './access';

interface LoginProps extends Reducers {
  goToForm?: (screenName: string) => void
  dispatch?: any
  navigation?: any
  authenticationState: AuthenticationState
}

function Login(props: LoginProps): JSX.Element {
  const [isLoading, setIsLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [showTwoFactor, setShowTwoFactor] = useState(false)

  const handleOnPress = async () => {
    setIsLoading(true)

    try {
      const userLoginData = await apiLogin(email)

      if (userLoginData.tfa && !twoFactorCode) {setShowTwoFactor(true)}
      else {await props.dispatch(userActions.signin(email, password, userLoginData.sKey, twoFactorCode))}

    } catch (err) {
      analytics.track('user-signin-attempted', {
        status: 'error',
        message: err.message
      }).catch(() => { })

      Alert.alert('Could not log in', err.message)
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (props.authenticationState.error) {
      Alert.alert('Login error', props.authenticationState.error)
      setIsLoading(false)
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

  return (
    <KeyboardAvoidingView behavior='height' style={styles.container}>
      <View style={[styles.containerCentered, isLoading ? styles.halfOpacity : {}]}>
        <View style={styles.containerHeader}>
          <View style={styles.flexRow}>
            <Text style={styles.title}>{strings.screens.login_screen.title}</Text>
          </View>

          <View style={styles.buttonWrapper}>
            <TouchableOpacity
              style={[styles.button, styles.buttonOn]}
              disabled={isLoading}
            >
              <Text style={styles.buttonOnLabel}>{strings.components.buttons.sign_in}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={1}
              style={[styles.button, styles.buttonOff]}
              onPress={() => props.navigation.replace('Register')}
              disabled={isLoading}
            >
              <Text style={styles.buttonOffLabel}>{strings.components.buttons.create}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={showTwoFactor ? styles.hideInputFieldWrapper : styles.showInputFieldsWrapper}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={value => setEmail(value)}
              placeholder={strings.components.inputs.email}
              placeholderTextColor="#666"
              maxLength={64}
              keyboardType="email-address"
              autoCapitalize={'none'}
              autoCorrect={false}
              textContentType="emailAddress"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={value => setPassword(value)}
              placeholder={strings.components.inputs.password}
              placeholderTextColor="#666"
              secureTextEntry={true}
              textContentType="password"
              editable={!isLoading}
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
            onPress={() => handleOnPress()}>
            <Text style={styles.buttonOnLabel}>{isLoading ? strings.components.buttons.descrypting : strings.components.buttons.sign_in}</Text>
          </TouchableHighlight>

          <Text style={styles.forgotPasswordText} onPress={() => props.navigation.replace('Forgot')}>{strings.screens.login_screen.forgot}</Text>
        </View>
      </View>

      <Text style={styles.versionLabel}>Internxt Drive v1.3.7(1)</Text>
    </KeyboardAvoidingView>
  )
}

const mapStateToProps = (state: any) => {
  return { authenticationState: state.authenticationState };
};

export default connect(mapStateToProps)(Login)

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: '#4585f5',
    borderRadius: 3.4,
    height: normalize(55),
    justifyContent: 'center',
    width: normalize(130)
  },
  buttonBlock: {
    width: '100%'
  },
  buttonFooterWrapper: {
    marginTop: normalize(15)
  },
  buttonOff: {
    backgroundColor: '#f2f2f2'
  },
  buttonOffLabel: {
    color: '#5c5c5c',
    fontFamily: 'CerebriSans-Medium',
    fontSize: normalize(15),
    textAlign: 'center'
  },
  buttonOn: {
    backgroundColor: '#4585f5'
  },
  buttonOnLabel: {
    color: '#fff',
    fontFamily: 'CerebriSans-Medium',
    fontSize: normalize(15),
    textAlign: 'center'
  },
  buttonWrapper: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: normalize(30)
  },
  container: {
    backgroundColor: '#FFFFFF',
    flex: 1,
    justifyContent: 'center',
    padding: normalize(20)
  },
  containerCentered: {
    alignSelf: 'center',
    height: 600,
    justifyContent: 'center',
    width: '100%'
  },
  containerHeader: {
  },
  flexRow: {
    flexDirection: 'row'
  },
  forgotPasswordText: {
    color: '#a4a4a4',
    marginTop: normalize(13)
  },
  halfOpacity: {
    opacity: 0.5
  },
  hideInputFieldWrapper: {
    display: 'none'
  },
  input: {
    color: '#000',
    flex: 1,
    fontFamily: 'CerebriSans-Medium',
    fontSize: normalize(15),
    letterSpacing: -0.2,
    paddingLeft: normalize(20)
  },
  inputWrapper: {
    borderColor: '#c9c9c9',
    borderRadius: 5,
    borderWidth: 1,
    height: normalize(55),
    justifyContent: 'center',
    marginBottom: normalize(13)
  },
  showInputFieldsWrapper: {
    justifyContent: 'center'
  },
  title: {
    color: '#000',
    fontFamily: 'CerebriSans-Bold',
    fontSize: normalize(22),
    letterSpacing: -1.7,
    marginBottom: normalize(30),
    marginTop: normalize(64)
  },
  versionLabel: {
    alignSelf: 'center',
    color: '#999999',
    fontFamily: 'CerebriSans-Regular',
    marginBottom: normalize(70),
    marginTop: normalize(30)
  }
});