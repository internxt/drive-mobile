import React, { useEffect, useState } from 'react'
import {
  KeyboardAvoidingView, TextInput, TouchableHighlight,
  View, Text, Alert,
  ScrollView
} from 'react-native';
import CheckBox from '../../components/CheckBox'
import { connect } from 'react-redux';
import strings from '../../../assets/lang/strings';
import { deviceStorage } from '../../helpers';
import { userActions } from '../../redux/actions';
import Intro from '../Intro'
import { apiLogin, validateEmail } from '../Login/access';
import { doRegister, isNullOrEmpty, isStrongPassword } from './registerUtils';
import InternxtLogo from '../../../assets/logo.svg'
import globalStyles from '../../styles/global.style';
import analytics from '../../helpers/lytics';
import * as Unicons from '@iconscout/react-native-unicons';
import { tailwind } from '../../helpers/designSystem';
import { Reducers } from '../../redux/reducers/reducers';

function Register(props: Reducers): JSX.Element {
  const [showIntro, setShowIntro] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const twoFactorCode = '';

  // Register form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptPolicy, setAcceptPolicy] = useState(false);

  const [firstNameFocus, setFirstNameFocus] = useState(false);
  const [lastNameFocus, setLastNameFocus] = useState(false);
  const [emailFocus, setEmailFocus] = useState(false);
  const [passwordFocus, setPasswordFocus] = useState(false);
  const [confirmPasswordFocus, setConfirmPasswordFocus] = useState(false);

  const [recaptchaToken, setRecaptchaToken] = useState<string>();

  const isEmptyEmail = isNullOrEmpty(email);
  const isValidEmail = validateEmail(email);
  const isValidFirstName = !isNullOrEmpty(firstName);
  const isValidLastName = !isNullOrEmpty(lastName);
  const isEmptyPassword = isNullOrEmpty(password);
  const isEmptyConfirmedPassword = isNullOrEmpty(confirmPassword);
  const isValidPassword = isStrongPassword(password);
  const isValidConfirmedPassword = confirmPassword && password === confirmPassword;

  const isValidForm = isValidEmail
    && isValidFirstName
    && isValidLastName
    && isValidPassword
    && isValidConfirmedPassword
    && acceptPolicy;

  const [registerButtonClicked, setRegisterButtonClicked] = useState(false);

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
        }
      })()
    }
  }, [props.authenticationState.loggedIn, props.authenticationState.token])

  if (showIntro) {
    return <Intro {...props} onFinish={() => setShowIntro(false)} />;
  }

  const handleOnPress = async () => {
    if (!isValidPassword) { return Alert.alert('', 'Please make sure your password contains at least six characters, a number, and a letter') }
    if (password !== confirmPassword) { return Alert.alert('', 'Please make sure your passwords match') }
    if (registerButtonClicked || isLoading) { return }

    setRegisterButtonClicked(true)
    setIsLoading(true)

    try {
      const userData = await doRegister({
        firstName: firstName,
        lastName: lastName,
        email: email,
        password: password,
        captcha: recaptchaToken
      })

      await Promise.all([
        analytics.identify(userData.uuid, { email: email }),
        analytics.track('user-signup', {
          properties: {
            userId: userData.uuid,
            email: email,
            platform: 'mobile'
          }
        })
      ])

      const userLoginData = await apiLogin(email)

      await props.dispatch(userActions.signin(email, password, userLoginData.sKey, twoFactorCode))
    } catch (err) {
      await analytics.track('user-signin-attempted', {
        status: 'error',
        message: err.message
      })
      setIsLoading(false)
      setRegisterButtonClicked(false)

      Alert.alert('Error while registering', err.message)
    }
  }

  return (
    <ScrollView style={tailwind('bg-white')}>
      <KeyboardAvoidingView
        behavior="padding">
        <View style={tailwind('p-6 py-0 bg-white')}>
          <View>
            <View style={tailwind('pb-6')}>
              <View style={tailwind('items-center mt-5')}>
                <InternxtLogo width={120} height={40} />
              </View>
              <View>
                <Text style={[globalStyles.text.normal, globalStyles.text.center]}>
                  {strings.screens.register_screen.create_account_title}
                </Text>
              </View>
            </View>

            <View>
              <View style={[tailwind('input-wrapper my-2'), isValidFirstName ? tailwind('input-valid') : {}]}>
                <TextInput
                  style={tailwind('input')}
                  value={firstName}
                  onChangeText={value => setFirstName(value)}
                  placeholder={strings.components.inputs.first_name}
                  placeholderTextColor="#666"
                  maxLength={64}
                  autoCapitalize='words'
                  autoCompleteType='off'
                  key='name'
                  autoCorrect={false}
                  onFocus={() => setFirstNameFocus(true)}
                  onBlur={() => setFirstNameFocus(false)}
                />
                <Unicons.UilUser
                  style={tailwind('input-icon')}
                  color={isValidFirstName ? '#42BE65' : '#7A869A'} />
              </View>

              <View style={[tailwind('input-wrapper my-2'), isValidLastName ? tailwind('input-valid') : {}]}>
                <TextInput
                  style={tailwind('input')}
                  value={lastName}
                  onChangeText={value => setLastName(value)}
                  placeholder={strings.components.inputs.last_name}
                  placeholderTextColor="#666"
                  maxLength={64}
                  autoCapitalize='words'
                  autoCompleteType='off'
                  key='lastname'
                  autoCorrect={false}
                  onFocus={() => setLastNameFocus(true)}
                  onBlur={() => setLastNameFocus(false)}
                />
                <Unicons.UilUser
                  style={tailwind('input-icon')}
                  color={isValidLastName ? '#42BE65' : '#7A869A'} />
              </View>

              <View style={[tailwind('input-wrapper my-2'), isEmptyEmail ? {} : tailwind(isValidEmail ? 'input-valid' : 'input-error')]}>
                <TextInput
                  style={tailwind('input')}
                  value={email}
                  onChangeText={value => setEmail(value)}
                  placeholder={strings.components.inputs.email}
                  placeholderTextColor="#666"
                  maxLength={64}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCompleteType="off"
                  autoCorrect={false}
                  key='mailaddress'
                  textContentType="emailAddress"
                  onFocus={() => setEmailFocus(true)}
                  onBlur={() => setEmailFocus(false)}
                />
                <Unicons.UilEnvelope
                  style={tailwind('input-icon')}
                  color={isValidEmail && !isEmptyEmail ? '#42BE65' : '#7A869A'} />
              </View>
            </View>

            <View>
              <View style={[tailwind('input-wrapper my-2'), isEmptyPassword ? {} : tailwind(isValidPassword ? 'input-valid' : 'input-error')]}>
                <TextInput
                  style={tailwind('input')}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={strings.components.inputs.password}
                  placeholderTextColor="#666"
                  textContentType="password"
                  autoCapitalize="none"
                  autoCompleteType="password"
                  autoCorrect={false}
                  secureTextEntry={true}
                  key='password'
                  onFocus={() => setPasswordFocus(true)}
                  onBlur={() => setPasswordFocus(false)}
                />
                <Unicons.UilEye
                  style={tailwind('input-icon hidden')}
                  color={isValidPassword || isValidPassword || passwordFocus ? '#42BE65' : '#7A869A'} />
              </View>

              <View style={[tailwind('input-wrapper my-2'), isEmptyConfirmedPassword ? {} : tailwind(isValidConfirmedPassword ? 'input-valid' : 'input-error')]}>
                <TextInput
                  style={tailwind('input')}
                  value={confirmPassword}
                  onChangeText={value => setConfirmPassword(value)}
                  placeholder={strings.components.inputs.confirm_password}
                  placeholderTextColor="#666"
                  secureTextEntry={true}
                  textContentType="password"
                  key='confirmPassword'
                  onFocus={() => setConfirmPasswordFocus(true)}
                  onBlur={() => setConfirmPasswordFocus(false)}
                />
                <Unicons.UilEye
                  style={tailwind('input-icon hidden')}
                  color={isValidConfirmedPassword || confirmPasswordFocus ? '#42BE65' : '#7A869A'} />
              </View>
            </View>
          </View>

          <View style={tailwind('mt-3')}>
            <Text style={tailwind('text-xs text-gray-50')}>{strings.screens.register_screen.security_subtitle}</Text>
          </View>

          <View style={tailwind('py-3')}>
            <CheckBox
              text="Accept terms, conditions and privacy policy"
              value={acceptPolicy}
              onChange={setAcceptPolicy}
            ></CheckBox>
          </View>

          <View>
            <View>
              <View>
                <TouchableHighlight
                  disabled={!isValidForm || registerButtonClicked}
                  style={[tailwind('btn btn-primary my-5'), !isValidForm || registerButtonClicked ? tailwind('opacity-50') : {}]}
                  underlayColor="#4585f5"
                  onPress={() => handleOnPress()}>
                  <Text style={tailwind('text-base btn-label')}>{registerButtonClicked ? strings.components.buttons.creating_button : strings.components.buttons.create}</Text>
                </TouchableHighlight>
              </View>
            </View>

            <Text style={tailwind('text-center mt-2')} onPress={() => props.navigation.replace('Login')}>
              <Text style={tailwind('text-sm text-blue-60')}>{strings.screens.login_screen.title}</Text>
            </Text>

          </View>
        </View>
      </KeyboardAvoidingView>
    </ScrollView>
  );
}

const mapStateToProps = (state: any) => {
  return { authenticationState: state.authenticationState };
};

export default connect(mapStateToProps)(Register)