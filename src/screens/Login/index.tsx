import React, { useEffect } from 'react'
import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Alert, TextInput, TouchableHighlight, TouchableWithoutFeedback } from 'react-native';
import { connect } from 'react-redux';
import strings from '../../../assets/lang/strings';
import { deviceStorage } from '../../helpers';
import analytics from '../../helpers/lytics';
import { userActions } from '../../redux/actions';
import { Reducers } from '../../redux/reducers/reducers';
import { validate2FA, apiLogin } from './access';
import InternxtLogo from '../../../assets/logo.svg'
import { getColor, tailwind } from '../../helpers/designSystem';
import * as Unicons from '@iconscout/react-native-unicons'
import VersionUpdate from '../../components/VersionUpdate';

interface LoginProps extends Reducers {
  goToForm?: (screenName: string) => void
}

function Login(props: LoginProps): JSX.Element {
  const [isLoading, setIsLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [showTwoFactor, setShowTwoFactor] = useState(false)
  const [showPasswordText, setShowPasswordText] = useState(false);

  const handleOnPress = async () => {
    setIsLoading(true)

    try {
      const userLoginData = await apiLogin(email)

      if (userLoginData.tfa && !twoFactorCode) {
        setShowTwoFactor(true)
        setIsLoading(false)
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
    <KeyboardAvoidingView behavior='height' style={tailwind('p-5 bg-white h-full justify-between')}>
      <View></View>
      <View style={isLoading ? tailwind('opacity-50') : tailwind('opacity-100')}>
        <View>
          <View style={tailwind('items-center pb-10')}>
            <InternxtLogo />
          </View>
        </View>

        <View style={showTwoFactor ? tailwind('hidden') : tailwind('flex')}>
          <View style={tailwind('input-wrapper my-2 items-stretch')}>
            <TextInput
              style={tailwind('input pl-4')}
              value={email}
              onChangeText={value => setEmail(value)}
              placeholder={strings.components.inputs.email}
              placeholderTextColor="#666"
              maxLength={64}
              keyboardType="email-address"
              autoCapitalize={'none'}
              autoCorrect={false}
              autoCompleteType="username"
              textContentType="emailAddress"
              editable={!isLoading}
            />
          </View>

          <View style={tailwind('input-wrapper my-2 items-stretch')}>
            <TextInput
              style={tailwind('input pl-4')}
              value={password}
              onChangeText={value => setPassword(value)}
              placeholder={strings.components.inputs.password}
              placeholderTextColor="#666"
              secureTextEntry={!showPasswordText}
              autoCompleteType="password"
              autoCapitalize="none"
              textContentType="password"
              editable={!isLoading}
            />
            <TouchableWithoutFeedback
              onPress={() => setShowPasswordText(!showPasswordText)}
            >
              <View style={tailwind('justify-center p-3')}>

                {showPasswordText
                  ?
                  <Unicons.UilEyeSlash color={getColor('neutral-80')} />

                  :
                  <Unicons.UilEye color={getColor('neutral-80')} />

                }
              </View>
            </TouchableWithoutFeedback>
          </View>
        </View>

        <View style={showTwoFactor ? tailwind('') : tailwind('hidden')}>
          <View style={[tailwind('input-wrapper my-2 items-stretch'), validate2FA(twoFactorCode) ? {} : tailwind('border-red-50')]}>
            <TextInput
              style={tailwind('input pl-4')}
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

          <Text style={tailwind('text-center text-sm m-2 text-blue-60')} onPress={() => props.navigation.replace('Forgot')}>
            {strings.screens.login_screen.forgot}
          </Text>

          <Text style={tailwind('text-center mt-2')} onPress={() => props.navigation.replace('Register')}>
            <Text style={tailwind('text-sm')}>{strings.screens.login_screen.no_register}{' '}</Text>
            <Text style={tailwind('text-sm text-blue-60')}>{strings.screens.login_screen.register}</Text>
          </Text>
        </View>
      </View>

      <VersionUpdate {...props} />
    </KeyboardAvoidingView>
  )
}

const mapStateToProps = (state: any) => {
  return {
    authenticationState: state.authenticationState
  };
};

export default connect(mapStateToProps)(Login)
