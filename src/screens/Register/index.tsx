import React, { useState } from 'react'
import { View, Text, KeyboardAvoidingView, StyleSheet, Image, Alert } from "react-native";
import { TextInput, TouchableHighlight } from 'react-native-gesture-handler';
import { connect } from "react-redux";
import { normalize } from '../../helpers';
import analytics from '../../helpers/lytics';
import Intro from '../Intro'
import { validateEmail } from '../Login/access';
import { doRegister, isNullOrEmpty, isStrongPassword, resendActivationEmail } from './registerUtils';

function Register(props: any): any {
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

  const isValidEmail = validateEmail(email);
  const isValidFirstName = !isNullOrEmpty(firstName)
  const isValidLastName = !isNullOrEmpty(lastName)

  if (showIntro) {
    return <Intro onFinish={() => setShowIntro(false)} />;
  }

  if (registerStep === 1) {  
    const isValidStep = isValidFirstName && isValidLastName && isValidEmail;

    return (
      <KeyboardAvoidingView behavior="padding" style={styles.container}>
        <View style={styles.containerCentered}>
          <View style={styles.containerHeader}>
            <View style={{ flexDirection: 'row' }}>
              <Image style={styles.logo} source={require('../../../assets/images/logo.png')} />
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
            <View style={{ flexDirection: 'row' }}>
              <Image
                style={styles.logo}
                source={require('../../../assets/images/logo.png')}
              />
              <Text style={styles.title}>Internxt Security</Text>
            </View>


            <View>
              <Text
                style={{
                  fontSize: normalize(15),
                  color: '#737880',
                  fontFamily: 'CerebriSans-Regular',
                  textAlign: 'justify',
                  letterSpacing: -0.1,
                  marginTop: -15
                }}
              >
                Internxt Drive uses your password to encrypt and decrypt your
                files. Due to the secure nature of Internxt Drive, we don&apos;t
                know your password. That means that if you ever forget it,
                your files are gone forever. With us, you&apos;re the only owner of
                your files. We strongly suggest you to:
                </Text>
            </View>

            <View
              style={{
                backgroundColor: '#f7f7f7',
                padding: normalize(23),
                marginTop: normalize(30)
              }}
            >
              <View style={{ flexDirection: 'row', marginBottom: 10 }}>
                <Text>{'\u2022'}</Text>
                <Text
                  style={{
                    flex: 1,
                    paddingLeft: normalize(9),
                    color: '#737880',
                    fontSize: normalize(15),
                    fontFamily: 'CerebriSans-Regular'
                  }}
                >
                  Store your Password. Keep it safe and secure.
                  </Text>
              </View>
              <View style={{ flexDirection: 'row' }}>
                <Text>{'\u2022'}</Text>
                <Text
                  style={{
                    flex: 1,
                    paddingLeft: normalize(9),
                    color: '#737880',
                    fontSize: normalize(15),
                    fontFamily: 'CerebriSans-Regular'
                  }}
                >
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
      <KeyboardAvoidingView behavior="padding" style={styles.container}>
        <View style={[styles.containerCentered, isLoading ? { opacity: 0.5 } : {}]}>
          <View style={styles.containerHeader}>
            <View style={{ flexDirection: 'row' }}>
              <Image
                style={styles.logo}
                source={require('../../../assets/images/logo.png')}
              />
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
                onPress={() => {
                  if (registerButtonClicked || isLoading) {
                    return;
                  }
                  setRegisterButtonClicked(true)
                  setIsLoading(true)

                  doRegister({ firstName, lastName, email, password })
                    .then((userData) => {
                      analytics.identify(userData.uuid, { email }).catch(() => { })
                      setRegisterStep(4)
                    }).catch(err => {
                      Alert.alert(err.message)
                    }).finally(() => {
                      setIsLoading(false)
                      setRegisterButtonClicked(false)
                    })
                }}
              >
                <Text style={styles.buttonOnLabel}>{isLoading ? 'Creating your account...' : 'Continue'}</Text>
              </TouchableHighlight>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  if (registerStep === 4) {
    return (
      <View style={styles.container}>
        <View style={styles.containerCentered}>
          <View style={styles.containerHeader}>

            <View style={{ flexDirection: 'row' }}>
              <Image
                style={styles.logo}
                source={require('../../../assets/images/logo.png')}
              />
              <Text style={styles.title}>Activation Email</Text>
            </View>

            <View>
              <Text
                style={{
                  fontSize: normalize(17),
                  color: '#737880',
                  fontFamily: 'CerebriSans-Regular',
                  marginTop: -10
                }}
              >
                Please check your email and follow the instructions to
                activate your account so you can start using Internxt Drive.
                </Text>
            </View>

            <View
              style={{
                backgroundColor: '#f7f7f7',
                padding: normalize(23),
                marginTop: normalize(30)
              }}
            >
              <Text
                style={{
                  color: '#737880',
                  fontSize: normalize(17),
                  fontFamily: 'CerebriSans-Regular'
                }}
              >
                By creating an account, you are agreeing to our Terms &amp;
                Conditions and Privacy Policy.
                </Text>
            </View>

            <View style={styles.buttonFooterWrapper}>
              <TouchableHighlight
                style={[styles.button, styles.buttonBlock, { marginTop: normalize(15) }]}
                underlayColor="#4585f5" onPress={() => {
                  setRegisterButtonClicked(true)
                  setIsLoading(true)
                  resendActivationEmail(email).then(() => {
                    Alert.alert(`Activation email sent to ${email}`)
                  }).catch(err => {
                    Alert.alert(err.message)
                  }).finally(() => {
                    setRegisterButtonClicked(false)
                    setIsLoading(false)
                  })
                }}>
                <Text style={styles.buttonOnLabel}>Re-send activation email</Text>
              </TouchableHighlight>
              <TouchableHighlight
                activeOpacity={1}
                underlayColor="#ffffff"
                onPress={() => props.navigation.replace('Login')}>
                <Text style={styles.link}>Sign in</Text>
              </TouchableHighlight>
            </View>
          </View>
        </View>
      </View>
    );
  }
}

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
    height: normalize(600)
  },
  containerHeader: {
    borderWidth: 0
  },
  logo: {
    resizeMode: 'contain',
    height: normalize(50),
    width: normalize(37),
    marginLeft: -7
  },
  title: {
    fontFamily: 'CerebriSans-Bold',
    fontSize: normalize(22),
    letterSpacing: -1.7,
    color: '#000',
    marginBottom: normalize(30),
    marginTop: normalize(12),
    marginLeft: normalize(3)
  },
  subtitle: {
    fontFamily: 'CerebriSans-Medium',
    fontSize: normalize(22),
    color: '#fff',
    opacity: 0.76
  },
  buttonWrapper: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: normalize(30),
    justifyContent: 'space-between'
  },
  buttonFooterWrapper: {
    marginTop: normalize(20)
  },
  button: {
    alignSelf: 'stretch',
    height: normalize(55),
    width: normalize(130),
    borderRadius: 3.4,
    backgroundColor: '#4585f5',
    marginBottom: normalize(10),
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonBlock: {
    width: '100%'
  },
  buttonDisabled: {
    opacity: 0.5
  },
  buttonOn: {
    backgroundColor: '#4585f5',
    alignItems: 'center'
  },
  buttonOff: {
    backgroundColor: '#f2f2f2',
    alignItems: 'center'
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
  buttonRight: {
    marginLeft: normalize(10)
  },
  buttonLeft: {
    marginRight: normalize(10)
  },
  redirectMessage: {
    fontFamily: 'CerebriSans-Medium',
    fontSize: normalize(15),
    letterSpacing: 0.3,
    color: '#fff',
    opacity: 0.6
  },
  input: {
    fontFamily: 'CerebriSans-Medium',
    letterSpacing: -0.2,
    fontSize: normalize(15),
    color: '#000',
    flex: 1,
    paddingLeft: 20
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
    marginBottom: normalize(15)
  },
  link: {
    fontFamily: 'CerebriSans-Regular',
    textAlign: 'center',
    color: '#737880',
    fontSize: normalize(15),
    marginTop: normalize(10)
  }
});

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(Register)