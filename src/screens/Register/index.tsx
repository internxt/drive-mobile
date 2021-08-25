import React, { useEffect, useState } from 'react'
import {
  KeyboardAvoidingView,
  StyleSheet, TextInput, TouchableOpacity,
  View, Text, Alert,
  ScrollView, TouchableWithoutFeedback
} from 'react-native';
import CheckBox from '../../components/CheckBox'
import { connect } from 'react-redux';
import strings from '../../../assets/lang/strings';
import { deviceStorage, normalize } from '../../helpers';
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
import { userService } from '../../redux/services';
import { notify } from '../../helpers/toast';

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

  const isValidEmail = validateEmail(email);
  const isValidFirstName = !isNullOrEmpty(firstName)
  const isValidLastName = !isNullOrEmpty(lastName)
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
      const userData = await doRegister({ firstName: firstName, lastName: lastName, email: email, password: password })

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

      const signInData = await userService.signin(email, password, userLoginData.sKey, twoFactorCode)

      props.dispatch(userActions.signin(signInData));
    } catch (err) {
      await analytics.track('user-signin-attempted', {
        status: 'error',
        message: err.message
      })
      setIsLoading(false)
      setRegisterButtonClicked(false)

      notify({
        text: err.message,
        type: 'error'
      })
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

            <View style={styles.showInputFieldsWrapper}>
              <View style={[tailwind('input-wrapper my-2'), tailwind(isValidFirstName ? 'input-valid' : 'input-error')]}>
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
                  color={firstNameFocus || isValidFirstName ? '#42BE65' : '#7A869A'} />
              </View>

              <View style={[tailwind('input-wrapper my-2'), tailwind(isValidLastName ? 'input-valid' : 'input-error')]}>
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
                  color={lastNameFocus || isValidLastName ? '#42BE65' : '#7A869A'} />
              </View>

              <View style={[tailwind('input-wrapper my-2'), tailwind(isValidEmail ? 'input-valid' : 'input-error')]}>
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
                  color={emailFocus || isValidEmail ? '#42BE65' : '#7A869A'} />
              </View>
            </View>

            <View style={styles.showInputFieldsWrapper}>
              <View style={[tailwind('input-wrapper my-2'), tailwind(isValidPassword ? 'input-valid' : 'input-error')]}>
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
                  style={[tailwind('input-icon'), { display: 'none' }]}
                  color={isValidPassword || isValidPassword || passwordFocus ? '#42BE65' : '#7A869A'} />
              </View>

              <View style={[tailwind('input-wrapper my-2'), tailwind(isValidConfirmedPassword ? 'input-valid' : 'input-error')]}>
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
                  style={[tailwind('input-icon'), { display: 'none' }]}
                  color={isValidConfirmedPassword || confirmPasswordFocus ? '#42BE65' : '#7A869A'} />
              </View>
            </View>
          </View>

          <View style={tailwind('my-5')}>
            <Text style={tailwind('text-sm')}>{strings.screens.register_screen.security_subtitle}</Text>
          </View>

          <View style={tailwind('py-2')}>
            <CheckBox
              text="Accept terms, conditions and privacy policy"
              value={acceptPolicy}
              onChange={setAcceptPolicy}
            ></CheckBox>
          </View>

          <View>
            <View style={styles.containerCentered}>
              <View>
                <TouchableOpacity
                  disabled={!isValidForm || registerButtonClicked}
                  style={[globalStyles.buttonInputStyle.button, globalStyles.buttonInputStyle.block, { backgroundColor: isValidForm || registerButtonClicked ? '#0F62FE' : '#A6C8FF' }]}
                  onPress={handleOnPress}
                >
                  <Text style={styles.buttonOnLabel}>{registerButtonClicked ? strings.components.buttons.creating_button : strings.components.buttons.create}</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={tailwind('py-5')}>
              <TouchableWithoutFeedback onPress={() => props.navigation.replace('Login')}>
                <Text style={[globalStyles.text.link, globalStyles.text.center]}>{strings.screens.login_screen.title}</Text>
              </TouchableWithoutFeedback>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  buttonOnLabel: {
    color: '#fff',
    fontFamily: 'NeueEinstellung-Medium',
    fontSize: normalize(15),
    textAlign: 'center'
  },
  containerCentered: {
    alignSelf: 'stretch',
    justifyContent: 'center'
  },
  showInputFieldsWrapper: {
    justifyContent: 'center'
  }
});

const mapStateToProps = (state: any) => {
  return { authenticationState: state.authenticationState };
};

export default connect(mapStateToProps)(Register)