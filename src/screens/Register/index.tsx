import React, { useEffect, useState } from 'react'
import { View, Text, KeyboardAvoidingView, StyleSheet, Alert } from 'react-native';
import { TextInput, TouchableHighlight } from 'react-native-gesture-handler';
import { connect } from 'react-redux';
import { deviceStorage, normalize } from '../../helpers';
import analytics from '../../helpers/lytics';
import { userActions } from '../../redux/actions';
import Intro from '../Intro'
import { apiLogin, validateEmail } from '../Login/access';
import { doRegister, isNullOrEmpty, isStrongPassword } from './registerUtils';

function Register(props: any): JSX.Element {
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
              <Text style={styles.title}>Create an account</Text>
            </View>

            <View style={styles.buttonWrapper}>

              <TouchableHighlight
                style={[styles.button, styles.buttonOff]}
                underlayColor="#f2f2f2"
                activeOpacity={1}
                onPress={() => props.navigation.replace('Login')}>
                <Text style={styles.buttonOffLabel}>Sign in</Text>
              </TouchableHighlight>

              <TouchableHighlight style={[styles.button, styles.buttonOn]}>
                <Text style={styles.buttonOnLabel}>Create account</Text>
              </TouchableHighlight>

            </View>
          </View>
          <View style={styles.showInputFieldsWrapper}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, !isValidFirstName ? {} : {}]}
                value={firstName}
                onChangeText={value => setFirstName(value)}
                placeholder="First name"
                placeholderTextColor="#666"
                maxLength={64}
              />
            </View>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, !isValidLastName ? {} : {}]}
                value={lastName}
                onChangeText={value => setLastName(value)}
                placeholder="Last name"
                placeholderTextColor="#666"
                maxLength={64}
              />
            </View>
            <View style={styles.inputWrapper}>
              <TextInput
                autoCapitalize="none"
                style={[styles.input, isValidEmail ? {} : {}]}
                value={email}
                onChangeText={value => setEmail(value)}
                placeholder="Email address"
                placeholderTextColor="#666"
                maxLength={64}
                keyboardType="email-address"
                textContentType="emailAddress"
              />
            </View>
          </View>
          <View style={styles.buttonFooterWrapper}>
            <TouchableHighlight
              style={[styles.button, styles.buttonBlock, isValidStep ? {} : styles.buttonDisabled]}
              underlayColor="#4585f5"
              disabled={!isValidStep}
              onPress={() => {
                setRegisterStep(2);
              }}>
              <Text style={styles.buttonOnLabel}>Continue</Text>
            </TouchableHighlight>
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
              <Text style={styles.title}>Internxt Security</Text>
            </View>

            <View>
              <Text
                style={styles.textDisclaimer}
              >
                Internxt Drive uses your password to encrypt and decrypt your
                files. Due to the secure nature of Internxt Drive, we don&apos;t
                know your password. That means that if you ever forget it,
                your files are gone forever. With us, you&apos;re the only owner of
                your files. We strongly suggest you to:
              </Text>
            </View>

            <View style={styles.textStorePasswordContainer}>
              <View style={[styles.flexRow, { marginBottom: 10 }]}>
                <Text>{'\u2022'}</Text>
                <Text
                  style={styles.textStorePassword}
                >
                  Store your Password. Keep it safe and secure.
                </Text>
              </View>
              <View style={styles.flexRow}>
                <Text>{'\u2022'}</Text>
                <Text style={styles.textTip}>
                  Keep an offline backup of your password.
                </Text>
              </View>
            </View>

            <View style={[styles.buttonFooterWrapper, { marginTop: 42 }]}>
              <View style={styles.buttonWrapper}>
                <TouchableHighlight
                  style={[styles.button, styles.buttonOff, styles.buttonLeft]}
                  underlayColor="#f2f2f2"
                  onPress={() => setRegisterStep(1)}
                >
                  <Text style={styles.buttonOffLabel}>Back</Text>
                </TouchableHighlight>
                <TouchableHighlight
                  style={[styles.button, styles.buttonOn, styles.buttonRight]}
                  underlayColor="#4585f5"
                  onPress={() => setRegisterStep(3)}
                >
                  <Text style={styles.buttonOnLabel}>Continue</Text>
                </TouchableHighlight>
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

    return (
      <KeyboardAvoidingView behavior='height' style={styles.container}>
        <View style={[styles.containerCentered, isLoading ? styles.halfOpacity : {}]}>
          <View style={styles.containerHeader}>
            <View style={styles.flexRow}>
              <Text style={styles.title}>Create an account</Text>
            </View>
          </View>
          <View style={[styles.showInputFieldsWrapper, { marginTop: -10 }]}>
            <View style={styles.inputWrapper}>
              <TextInput
                autoCapitalize="none"
                style={[styles.input, !isValidPassword ? {} : {}]}
                value={password}
                onChangeText={value => setPassword(value)}
                placeholder="Password"
                placeholderTextColor="#666"
                secureTextEntry={true}
                textContentType="password"
              />
            </View>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, !isValidStep ? {} : {}]}
                value={confirmPassword}
                onChangeText={value => setConfirmPassword(value)}
                placeholder="Confirm password"
                placeholderTextColor="#666"
                secureTextEntry={true}
                textContentType="password"
              />
            </View>
          </View>
          <View style={styles.buttonFooterWrapper}>
            <View style={styles.buttonWrapper}>
              <TouchableHighlight
                style={[styles.button, styles.buttonOff, styles.buttonLeft]}
                underlayColor="#f2f2f2"
                onPress={() => setRegisterStep(2)}
              >
                <Text style={styles.buttonOffLabel}>Back</Text>
              </TouchableHighlight>
              <TouchableHighlight
                style={[styles.button, styles.buttonOn, styles.buttonRight]}
                underlayColor="#4585f5"
                disabled={registerButtonClicked}
                onPress={() => {
                  if (!isValidPassword) {
                    Alert.alert(
                      '',
                      'Please make sure your password contains at least six characters, a number, and a letter'
                    );
                    return
                  }
                  if (password !== confirmPassword) {
                    Alert.alert('', 'Please make sure your passwords match');
                    return
                  }
                  if (registerButtonClicked || isLoading) {
                    return;
                  }
                  setRegisterButtonClicked(true)
                  setIsLoading(true)

                  doRegister({ firstName, lastName, email, password })
                    .then((userData) => {
                      analytics.identify(userData.uuid, { email }).catch(() => { })
                      analytics.track('user-signup', {
                        properties: {
                          userId: userData.uuid,
                          email: email,
                          platform: 'mobile'
                        }
                      })
                    })
                    .then(() => {
                      apiLogin(email).then(userLoginData => {
                        props.dispatch(userActions.signin(email, password, userLoginData.sKey, twoFactorCode))
                      })
                    }).catch(err => {
                      analytics.track('user-signin-attempted', {
                        status: 'error',
                        message: err.message
                      }).catch(() => { })
                      Alert.alert(err.message)
                    })
                }}
              >
                <Text style={styles.buttonOnLabel}>{registerButtonClicked ? 'Creating...' : 'Continue'}</Text>
              </TouchableHighlight>
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
  return { ...state };
};

export default connect(mapStateToProps)(Register)