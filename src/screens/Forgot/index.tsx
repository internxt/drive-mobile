import { isValidEmail, sendDeactivationsEmail } from './ForgotUtils';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  TextInput,
  TouchableHighlight
} from 'react-native';
import React, { useEffect, useState } from 'react'
import { normalize } from '../../helpers';
import { connect } from 'react-redux';

function Forgot(props: any): JSX.Element {
  const [currentContainer, setCurrentCointainer] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Get email form field
  const [email, setIsEmail] = useState('');
  const isValidEmailField = isValidEmail(email);

  useEffect(() => { // do something after isLoading has updated
    if (isLoading === true) {
      if (!isValidEmailField) {
        setIsLoading(false)
        return Alert.alert('Warning', 'Enter a valid e-mail address');
      }
    }

  }, [isLoading])

  const sendDeactivationEmail = () => {
    if (isLoading) {
      return;
    }
    setIsLoading(true)
    sendDeactivationsEmail(email).then(() => {
      setIsLoading(false)
      setCurrentCointainer(2)

    }).catch(() => {
      setIsLoading(false)
      return Alert.alert('Error', 'Connection to server failed');
    });

  }

  if (currentContainer === 1) {

    return (
      <KeyboardAvoidingView behavior="padding" style={styles.container}>
        <View
          style={[
            styles.containerCentered,
            isLoading ? styles.halfOpacity : {}
          ]}
        >
          <View style={styles.containerHeader}>
            <View style={styles.flexRow}>
              <Image
                style={styles.logo}
                source={require('../../../assets/images/logo.png')}
              />
              <Text style={styles.title}>Internxt Security</Text>
            </View>
            <Text style={styles.text}>
                            As specified during the sign up process, Internxt Drive encrypts
                            your files, and only you have access to those. We never know
                            your password, and thus, that way, only you can decrypt your
                            account. For that reason, if you forget your password, we can&apos;t
                    restore your account. What we can do, however, is to{' '}
              <Text style={styles.bold}>
                                delete your account and erase all its files
              </Text>
                    , so that you can sign up again. Please enter your email below
                    so that we can process the account removal.
            </Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(value) => setIsEmail(value)}
                placeholder="Email address"
                placeholderTextColor="#666666"
                maxLength={64}
                keyboardType="email-address"
                textContentType="emailAddress"
              />
            </View>
            <View style={styles.buttonWrapper}>
              <TouchableHighlight
                style={[styles.button, styles.buttonOff, styles.buttonLeft]}
                underlayColor="#f2f2f2"
                onPress={() => props.navigation.replace('Login')}
              >
                <Text style={styles.buttonOffLabel}>Back</Text>
              </TouchableHighlight>
              <TouchableHighlight
                style={[styles.button, styles.buttonOn, styles.buttonRight]}
                underlayColor="#4585f5"
                onPress={() => {sendDeactivationEmail()
                }
                }
              >
                <Text style={styles.buttonOnLabel}>Continue</Text>
              </TouchableHighlight>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    );

  }

  if (currentContainer === 2) {
    return (
      <KeyboardAvoidingView behavior="padding" style={styles.container}>
        <View
          style={[
            styles.containerCentered,
            isLoading ? styles.halfOpacity : {}
          ]}
        >
          <View style={styles.containerHeader}>
            <View style={styles.flexRow}>
              <Image
                style={styles.logo}
                source={require('../../../assets/images/logo.png')}
              />

              <Text style={styles.title}>Deactivation Email</Text>
            </View>
            <Text style={styles.text}>
                            Please check your email and follow the instructions to
                            deactivate your account so you can start using Internxt Drive
                            again.
            </Text>
            <View style={styles.grayBox}>
              <Text style={styles.grayBoxText}>
                                Once you deactivate your account, you will be able to sign up
                                using the same email address. Please store your password
                                somewhere safe. With Internxt Drive, only you are the true
                                owner of your files on the cloud. With great power there must
                                also come great responsibility.
              </Text>
            </View>
            <View style={styles.buttonWrapper}>
              <TouchableHighlight
                style={[styles.button, styles.buttonOn]}
                underlayColor="#00aaff"
                onPress={() => sendDeactivationEmail()}
              >
                <Text style={styles.buttonOnLabel}>
                                    Re-send deactivation email
                </Text>
              </TouchableHighlight>
            </View>
            <Text
              style={styles.signUp}
              onPress={() => props.navigation.replace('Login')}
            >
                            Sign up
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    );

  }

  return <></>;

}
const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(Forgot)

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
  logo: {
    marginTop: normalize(-27),
    height: normalize(32),
    width: normalize(25),
    marginRight: normalize(7)
  },
  containerHeader: {
  },
  title: {
    fontFamily: 'CerebriSans-Bold',
    fontSize: normalize(22),
    letterSpacing: -1.5,
    color: '#000',
    marginBottom: normalize(15),
    marginTop: normalize(-25),
    marginLeft: normalize(3)
  },
  text: {
    fontFamily: 'CerebriSans-Regular',
    fontSize: normalize(15),
    color: '#737880',
    textAlign: 'justify',
    marginBottom: normalize(20)
  },
  bold: {
    fontFamily: 'CerebriSans-Bold'
  },
  inputWrapper: {
    height: normalize(55),
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#c9c9c9',
    justifyContent: 'center'
  },

  input: {
    fontFamily: 'CerebriSans-Medium',
    letterSpacing: -0.2,
    fontSize: normalize(15),
    color: '#000',
    flex: 1,
    paddingLeft: normalize(20)
  },
  buttonOnLabel: {
    fontFamily: 'CerebriSans-Medium',
    fontSize: normalize(15),
    color: '#fff'
  },
  buttonOffLabel: {
    fontFamily: 'CerebriSans-Medium',
    fontSize: normalize(15),
    color: '#5c5c5c'
  },
  button: {
    marginTop: normalize(10),
    height: normalize(55),
    borderRadius: 3.4,
    width: '45%',
    // height: '35%',
    justifyContent: 'center',
    alignItems: 'center'
  },
  buttonOn: {
    backgroundColor: '#4585f5',
    flex: 1
  },
  buttonOff: {
    backgroundColor: '#f2f2f2',
    flex: 1
  },
  buttonWrapper: {
    flexDirection: 'row',
    marginTop: normalize(15)
  },
  buttonRight: {
    marginLeft: normalize(10)
  },
  buttonLeft: {
    marginRight: normalize(10)
  },
  grayBox: {
    backgroundColor: '#f7f7f7',
    padding: normalize(23)
  },
  grayBoxText: {
    color: '#737880',
    fontSize: normalize(15),
    fontFamily: 'CerebriSans-Regular'
  },
  signUp: {
    fontFamily: 'CerebriSans-Regular',
    textAlign: 'center',
    color: '#737880',
    fontSize: normalize(15),
    marginTop: normalize(10),
    padding: normalize(20)
  },
  halfOpacity: {
    opacity: 0.5
  },
  flexRow: {
    flexDirection: 'row'
  }
});