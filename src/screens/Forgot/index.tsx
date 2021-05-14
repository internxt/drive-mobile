import { isValidEmail, sendDeactivationsEmail } from './ForgotUtils';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  TextInput,
  TouchableHighlight
} from 'react-native';
import React, { useEffect, useState } from 'react'
import { normalize } from '../../helpers';
import { connect } from 'react-redux';
import strings from '../../../assets/lang/strings';

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
              <Text style={styles.title}>{strings.screens.forgot_password.title}</Text>
            </View>

            <Text style={styles.text}>
              {strings.screens.forgot_password.subtitle_1}

              <Text style={styles.bold}>{strings.screens.forgot_password.bold}</Text>

              {strings.screens.forgot_password.subtitle_2}
            </Text>

            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(value) => setIsEmail(value)}
                placeholder={strings.components.inputs.email}
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
                <Text style={styles.buttonOffLabel}>{strings.components.buttons.back}</Text>
              </TouchableHighlight>

              <TouchableHighlight
                style={[styles.button, styles.buttonOn, styles.buttonRight]}
                underlayColor="#4585f5"
                onPress={() => {
                  sendDeactivationEmail()
                }
                }
              >
                <Text style={styles.buttonOnLabel}>{strings.components.buttons.continue}</Text>
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
              <Text style={styles.title}>{strings.screens.deactivation_screen.title}</Text>
            </View>

            <Text style={styles.text}>
              {strings.screens.deactivation_screen.subtitle_1}
            </Text>

            <View style={styles.grayBox}>
              <Text style={styles.grayBoxText}>
                {strings.screens.deactivation_screen.subtitle_2}
              </Text>
            </View>

            <View style={styles.buttonWrapper}>
              <TouchableHighlight
                style={[styles.button, styles.buttonOn]}
                underlayColor="#00aaff"
                onPress={() => sendDeactivationEmail()}
              >
                <Text style={styles.buttonOnLabel}>
                  {strings.components.buttons.deactivation}
                </Text>
              </TouchableHighlight>
            </View>

            <Text
              style={styles.signUp}
              onPress={() => props.navigation.replace('Register')}
            >
              {strings.components.buttons.sing_up}
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
  bold: {
    fontFamily: 'CerebriSans-Bold'
  },
  button: {
    alignItems: 'center',
    borderRadius: 3.4,
    height: normalize(55),
    justifyContent: 'center',
    marginTop: normalize(10),
    width: '45%'
  },
  buttonLeft: {
    marginRight: normalize(10)
  },
  buttonOff: {
    backgroundColor: '#f2f2f2',
    flex: 1
  },
  buttonOffLabel: {
    color: '#5c5c5c',
    fontFamily: 'CerebriSans-Medium',
    fontSize: normalize(15)
  },
  buttonOn: {
    backgroundColor: '#4585f5',
    flex: 1
  },
  buttonOnLabel: {
    color: '#fff',
    fontFamily: 'CerebriSans-Medium',
    fontSize: normalize(15)
  },
  buttonRight: {
    marginLeft: normalize(10)
  },
  buttonWrapper: {
    flexDirection: 'row',
    marginTop: normalize(15)
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
  },
  flexRow: {
    flexDirection: 'row'
  },
  grayBox: {
    backgroundColor: '#f7f7f7',
    padding: normalize(23)
  },
  grayBoxText: {
    color: '#737880',
    fontFamily: 'CerebriSans-Regular',
    fontSize: normalize(15)
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
    paddingLeft: normalize(20)
  },
  inputWrapper: {
    borderColor: '#c9c9c9',
    borderRadius: 5,
    borderWidth: 1,
    height: normalize(55),
    justifyContent: 'center'
  },
  signUp: {
    color: '#737880',
    fontFamily: 'CerebriSans-Regular',
    fontSize: normalize(15),
    marginTop: normalize(10),
    padding: normalize(20),
    textAlign: 'center'
  },
  text: {
    color: '#737880',
    fontFamily: 'CerebriSans-Regular',
    fontSize: normalize(15),
    marginBottom: normalize(20),
    textAlign: 'justify'
  },
  title: {
    color: '#000',
    fontFamily: 'CerebriSans-Bold',
    fontSize: normalize(22),
    letterSpacing: -1.5,
    marginBottom: normalize(15),
    marginTop: normalize(-25)
  }
});