import React, { useEffect } from 'react'
import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, StyleSheet, Alert, TextInput, TouchableHighlight } from 'react-native';
import { connect } from 'react-redux';
import strings from '../../../assets/lang/strings';
import { deviceStorage } from '../../helpers';
import analytics from '../../helpers/lytics';
import { normalize } from '../../helpers/normalize'
import { userActions } from '../../redux/actions';
import { Reducers } from '../../redux/reducers/reducers';
import globalStyles from '../../styles/global.style';
import { validate2FA, apiLogin } from './access';
import InternxtLogo from '../../../assets/logo.svg'
import { tailwind } from '../../helpers/designSystem';
import * as Unicons from '@iconscout/react-native-unicons'
import { userActionTypes } from '../../redux/constants';

interface LoginProps extends Reducers {
  goToForm?: (screenName: string) => void
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

      if (userLoginData.tfa && !twoFactorCode) {
        setShowTwoFactor(true)
      } else {
        await props.dispatch(userActions.signin(email, password, userLoginData.sKey, twoFactorCode))
      }

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
      props.dispatch({ type: userActionTypes.SIGNIN_FAILURE, payload: '' })
      setIsLoading(false)
    }
  }, [props.authenticationState.error])

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
        <View>
          <View style={tailwind('items-center pb-10')}>
            <InternxtLogo />
          </View>
        </View>

        <View style={showTwoFactor ? styles.hideInputFieldWrapper : styles.showInputFieldsWrapper}>
          <View style={tailwind('input-wrapper my-2')}>
            <TextInput
              style={tailwind('input')}
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
            <Unicons.UilEnvelope
              style={tailwind('input-icon')}
              color="#7A869A" />
          </View>

          <View style={tailwind('input-wrapper my-2')}>
            <TextInput
              style={tailwind('input')}
              value={password}
              onChangeText={value => setPassword(value)}
              placeholder={strings.components.inputs.password}
              placeholderTextColor="#666"
              secureTextEntry={true}
              textContentType="password"
              editable={!isLoading}
            />
            <Unicons.UilEye
              style={[tailwind('input-icon'), { display: 'none' }]}
              color="#7A869A" />
          </View>
        </View>

        <View style={showTwoFactor ? styles.showInputFieldsWrapper : styles.hideInputFieldWrapper}>
          <View style={globalStyles.textInputStyle.wrapper}>
            <TextInput
              style={[styles.input, validate2FA(twoFactorCode) ? {} : styles.showBorder]}
              value={twoFactorCode}
              onChangeText={value => setTwoFactorCode(value)}
              placeholder="Two-factor code"
              placeholderTextColor="#666"
              maxLength={64}
              keyboardType="numeric"
              textContentType="none" />
          </View>
        </View>

        <View>
          <TouchableHighlight
            style={tailwind('btn btn-primary my-5')}
            underlayColor="#4585f5"
            onPress={handleOnPress}>
            <Text style={tailwind('text-base btn-label')}>{isLoading ? strings.components.buttons.descrypting : strings.components.buttons.sign_in}</Text>
          </TouchableHighlight>

          <Text style={[globalStyles.text.link, globalStyles.text.center, globalStyles.text.mt10]} onPress={() => props.navigation.replace('Forgot')}>
            {strings.screens.login_screen.forgot}
          </Text>

          <Text style={[globalStyles.text.center, globalStyles.text.mt10]} onPress={() => props.navigation.replace('Register')}>
            <Text style={globalStyles.text.normal}>{strings.screens.login_screen.no_register}{', '}</Text>
            <Text style={globalStyles.text.link}>{strings.screens.login_screen.register}</Text>
          </Text>
        </View>
      </View>

      <Text style={styles.versionLabel}>Internxt Drive v1.4.0</Text>
    </KeyboardAvoidingView>
  )
}

const mapStateToProps = (state: any) => {
  return { authenticationState: state.authenticationState };
};

export default connect(mapStateToProps)(Login)

const styles = StyleSheet.create({
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
  halfOpacity: {
    opacity: 0.5
  },
  hideInputFieldWrapper: {
    opacity: 0,
    display: 'none'
  },
  input: {
    color: '#000',
    flex: 1,
    fontFamily: 'NeueEinstellung-Medium',
    fontSize: normalize(15),
    letterSpacing: -0.2,
    paddingLeft: normalize(20)
  },
  showInputFieldsWrapper: {
    justifyContent: 'center'
  },
  versionLabel: {
    alignSelf: 'center',
    color: '#999999',
    fontFamily: 'NeueEinstellung-Regular',
    position: 'absolute',
    bottom: 5
  },
  showBorder: { borderWidth: 1, borderColor: '#f00' }
});