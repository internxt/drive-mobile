import React, { useEffect, useState } from 'react'
import { View, Text, KeyboardAvoidingView, StyleSheet, Alert } from 'react-native';
import { TextInput, TouchableHighlight, TouchableOpacity } from 'react-native-gesture-handler';
import { connect } from 'react-redux';
import strings from '../../../assets/lang/strings';
import { deviceStorage, normalize } from '../../helpers';
import analytics from '../../helpers/lytics';
import { userActions } from '../../redux/actions';
import { AuthenticationState } from '../../redux/reducers/authentication.reducer';
import Intro from '../Intro'
import { apiLogin, validateEmail } from '../Login/access';
import { doRegister, isNullOrEmpty, isStrongPassword } from './registerUtils';

interface RegisterProps {
  authenticationState: AuthenticationState
  navigation: any
  dispatch: any
}

function Register(props: RegisterProps): JSX.Element {
  const [registerStep, setRegisterStep] = useState(1);
  const [showIntro, setShowIntro] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Register form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registerButtonClicked, setRegisterButtonClicked] = useState(false);
  const twoFactorCode = ''

  const isValidEmail = validateEmail(email);
  const isValidFirstName = !isNullOrEmpty(firstName)
  const isValidLastName = !isNullOrEmpty(lastName)

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

  if (showIntro) {
    return <Intro onFinish={() => setShowIntro(false)} />;
  }

  if (registerStep === 1) {
    const isValidStep = isValidFirstName && isValidLastName && isValidEmail;

    return (
      <KeyboardAvoidingView behavior="padding" style={styles.container}>
        <View style={styles.containerCentered}>
          <View style={styles.containerHeader}>
            <View style={styles.flexRow}>
              <Text style={styles.title}>{strings.screens.register_screen.create_account_title}</Text>
            </View>

            <View style={styles.buttonWrapper}>
              <TouchableOpacity
                style={[styles.button, styles.buttonOff]}
                onPress={() => props.navigation.replace('Login')}>
                <Text style={styles.buttonOffLabel}>{strings.components.buttons.sign_in}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.button, styles.buttonOn]}>
                <Text style={styles.buttonOnLabel}>{strings.components.buttons.create}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.showInputFieldsWrapper}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, !isValidFirstName ? {} : {}]}
                value={firstName}
                onChangeText={value => setFirstName(value)}
                placeholder={strings.components.inputs.first_name}
                placeholderTextColor="#666"
                maxLength={64}
                autoCapitalize='words'
                autoCompleteType='off'
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, !isValidLastName ? {} : {}]}
                value={lastName}
                onChangeText={value => setLastName(value)}
                placeholder={strings.components.inputs.last_name}
                placeholderTextColor="#666"
                maxLength={64}
                autoCapitalize='words'
                autoCompleteType='off'
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, isValidEmail ? {} : {}]}
                value={email}
                onChangeText={value => setEmail(value)}
                placeholder={strings.components.inputs.email}
                placeholderTextColor="#666"
                maxLength={64}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCompleteType="off"
                autoCorrect={false}
                textContentType="emailAddress"
              />
            </View>
          </View>

          <View style={styles.buttonFooterWrapper}>
            <TouchableOpacity
              style={[styles.button, styles.buttonBlock, isValidStep ? {} : styles.buttonDisabled]}
              disabled={!isValidStep}
              onPress={() => setRegisterStep(2)}
            >
              <Text style={styles.buttonOnLabel}>{strings.components.buttons.continue}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  if (registerStep === 2) {
    return (
      <View style={styles.container}>
        <View style={styles.containerCentered}>
          <View style={styles.containerHeader}>
            <View style={styles.flexRow}>
              <Text style={styles.title}>{strings.screens.register_screen.security_title}</Text>
            </View>

            <View>
              <Text style={styles.textDisclaimer}>{strings.screens.register_screen.security_subtitle}</Text>
            </View>

            <View style={styles.textStorePasswordContainer}>
              <View style={[styles.flexRow, { marginBottom: 10 }]}>
                <Text>{'\u2022'}</Text>

                <Text style={styles.textStorePassword}>{strings.screens.register_screen.suggestion_1}</Text>
              </View>

              <View style={styles.flexRow}>
                <Text>{'\u2022'}</Text>

                <Text style={styles.textTip}>{strings.screens.register_screen.suggestion_2}</Text>
              </View>
            </View>

            <View style={[styles.buttonFooterWrapper, { marginTop: 42 }]}>
              <View style={styles.buttonWrapper}>
                <TouchableOpacity
                  style={[styles.button, styles.buttonOff, styles.buttonLeft]}
                  onPress={() => setRegisterStep(1)}
                >
                  <Text style={styles.buttonOffLabel}>{strings.components.buttons.back}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.buttonOn, styles.buttonRight]}
                  onPress={() => setRegisterStep(3)}
                >
                  <Text style={styles.buttonOnLabel}>{strings.components.buttons.continue}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (registerStep === 3) {
    const isValidPassword = isStrongPassword(password);
    const isValidStep = (password === confirmPassword) && isValidPassword;

    const handleOnPress = async () => {
      if (!isValidPassword) return Alert.alert('', 'Please make sure your password contains at least six characters, a number, and a letter')
      if (password !== confirmPassword) return Alert.alert('', 'Please make sure your passwords match')
      if (registerButtonClicked || isLoading) return

      setRegisterButtonClicked(true)
      setIsLoading(true)

      try {
        const userData = await doRegister({ firstName, lastName, email, password })
        await Promise.all([
          analytics.identify(userData.uuid, { email }),
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
      <KeyboardAvoidingView behavior='height' style={styles.container}>
        <View style={[styles.containerCentered, isLoading ? styles.halfOpacity : {}]}>
          <View style={styles.containerHeader}>
            <View style={styles.flexRow}>
              <Text style={styles.title}>{strings.screens.register_screen.create_account_title}</Text>
            </View>
          </View>

          <View style={[styles.showInputFieldsWrapper, { marginTop: -10 }]}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, !isValidPassword ? {} : {}]}
                value={password}
                onChangeText={value => setPassword(value)}
                placeholder={strings.components.inputs.password}
                placeholderTextColor="#666"
                textContentType="password"
                autoCapitalize="none"
                autoCompleteType="password"
                autoCorrect={false}
                secureTextEntry={true}
              />
            </View>

            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, !isValidStep ? {} : {}]}
                value={confirmPassword}
                onChangeText={value => setConfirmPassword(value)}
                placeholder={strings.components.inputs.confirm_password}
                placeholderTextColor="#666"
                secureTextEntry={true}
                textContentType="password"
              />
            </View>
          </View>

          <View style={styles.buttonFooterWrapper}>
            <View style={styles.buttonWrapper}>
              <TouchableOpacity
                style={[styles.button, styles.buttonOff, styles.buttonLeft]}
                onPress={() => setRegisterStep(2)}
                disabled={registerButtonClicked}
              >
                <Text style={styles.buttonOffLabel}>{strings.components.buttons.back}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.buttonOn, styles.buttonRight]}
                onPress={() => handleOnPress()}
                disabled={registerButtonClicked}
              >
                <Text style={styles.buttonOnLabel}>{registerButtonClicked ? strings.components.buttons.creating_button : strings.components.buttons.continue}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }
  return <></>;
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: '#4585f5',
    borderRadius: 3.4,
    height: normalize(55),
    justifyContent: 'center',
    marginBottom: normalize(10),
    width: normalize(130)
  },
  buttonBlock: {
    width: '100%'
  },
  buttonDisabled: {
    opacity: 0.5
  },
  buttonFooterWrapper: {
    marginTop: normalize(20)
  },
  buttonLeft: {
    marginRight: normalize(10)
  },
  buttonOff: {
    alignItems: 'center',
    backgroundColor: '#f2f2f2'
  },
  buttonOffLabel: {
    color: '#5c5c5c',
    fontFamily: 'CerebriSans-Medium',
    fontSize: normalize(15),
    textAlign: 'center'
  },
  buttonOn: {
    alignItems: 'center',
    backgroundColor: '#4585f5'
  },
  buttonOnLabel: {
    color: '#fff',
    fontFamily: 'CerebriSans-Medium',
    fontSize: normalize(15),
    textAlign: 'center'
  },
  buttonRight: {
    marginLeft: normalize(10)
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
    height: normalize(600),
    justifyContent: 'center',
    width: '100%'
  },
  containerHeader: {
    borderWidth: 0
  },
  flexRow: {
    flexDirection: 'row'
  },
  halfOpacity: {
    opacity: 0.5
  },
  input: {
    color: '#000',
    flex: 1,
    fontFamily: 'CerebriSans-Medium',
    fontSize: normalize(15),
    letterSpacing: -0.2,
    paddingLeft: 20
  },
  inputWrapper: {
    borderColor: '#c9c9c9',
    borderRadius: 5,
    borderWidth: 1,
    height: normalize(55),
    justifyContent: 'center',
    marginBottom: normalize(15)
  },
  showInputFieldsWrapper: {
    justifyContent: 'center'
  },
  textDisclaimer: {
    color: '#737880',
    fontFamily: 'CerebriSans-Regular',
    fontSize: normalize(15),
    letterSpacing: -0.1,
    marginTop: -15,
    textAlign: 'justify'
  },
  textStorePassword: {
    color: '#737880',
    flex: 1,
    fontFamily: 'CerebriSans-Regular',
    fontSize: normalize(15),
    paddingLeft: normalize(9)
  },
  textStorePasswordContainer: {
    backgroundColor: '#f7f7f7',
    marginTop: normalize(30),
    padding: normalize(23)
  },
  textTip: {
    color: '#737880',
    flex: 1,
    fontFamily: 'CerebriSans-Regular',
    fontSize: normalize(15),
    paddingLeft: normalize(9)
  },
  title: {
    color: '#000',
    fontFamily: 'CerebriSans-Bold',
    fontSize: normalize(22),
    letterSpacing: -1.7,
    marginBottom: normalize(30),
    marginTop: normalize(12)
  }
});

const mapStateToProps = (state: any) => {
  return { authenticationState: state.authenticationState };
};

export default connect(mapStateToProps)(Register)