import React, { Component } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  TextInput,
  TouchableHighlight,
} from 'react-native';

class Forgot extends Component {
  constructor() {
    super();
    this.state = {
      isLoading: false,
      email: '',
      currentContainer: 1,
      isValidEmail: false,
    };
  }

  isValidEmail = (email) => {
    let re = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
    return re.test(String(email).toLowerCase());
  };

  sendDeactivationEmail() {
    if (this.state.isLoading) {
      return;
    }

    this.setState({ isLoading: true }, () => {
      if (!this.isValidEmail(this.state.email)) {
        this.setState({ isLoading: false });
        return Alert.alert('Warning', 'Enter a valid e-mail address');
      }

      const endpoint = `https://drive.internxt.com/api/reset/${this.state.email}`;
      fetch(endpoint)
        .then((res) => {
          if (res.status === 200) {
            this.setState({
              isLoading: false,
              currentContainer: 2,
            });
          } else {
            throw Error();
          }
        })
        .catch(() => {
          this.setState({ isLoading: false }, () => {
            return Alert.alert('Error', 'Connection to server failed');
          });
        });
    });
  }

  render() {
    if (this.state.currentContainer === 1) {
      return (
        <KeyboardAvoidingView behavior="padding" style={styles.container}>
          <View
            style={[
              styles.containerCentered,
              this.state.isLoading ? { opacity: 0.5 } : {},
            ]}
          >
            <View style={styles.containerHeader}>
            <View style={{flexDirection: 'row'}}>
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
                account. For that reason, if you forget your password, we can't
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
                  value={this.state.email}
                  onChangeText={(value) => this.setState({ email: value })}
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
                  underlayColor="#4585f5"
                  onPress={() => this.props.goToForm('SIGNIN')}
                >
                  <Text style={styles.buttonOffLabel}>Back</Text>
                </TouchableHighlight>
                <TouchableHighlight
                  style={[styles.button, styles.buttonOn, styles.buttonRight]}
                  underlayColor="#4585f5"
                  onPress={() => this.sendDeactivationEmail()}
                >
                  <Text style={styles.buttonOnLabel}>Continue</Text>
                </TouchableHighlight>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      );
    }

    if (this.state.currentContainer === 2) {
      return (
        <KeyboardAvoidingView behavior="padding" style={styles.container}>
          <View
            style={[
              styles.containerCentered,
              this.state.isLoading ? { opacity: 0.5 } : {},
            ]}
          >
            <View style={styles.containerHeader}>
              <View>
                <Image
                  style={styles.logo}
                  source={require('../../../assets/images/logo.png')}
                />
              </View>
              <Text style={styles.title}>Deactivation Email</Text>
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
                  onPress={() => this.sendDeactivationEmail()}
                >
                  <Text style={styles.buttonOnLabel}>
                    Re-send deactivation email
                  </Text>
                </TouchableHighlight>
              </View>
              <Text
                style={styles.signUp}
                onPress={() => this.props.goToForm('SIGNIN')}
              >
                Sign up
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      );
    }
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  containerCentered: {
    justifyContent: 'center',
    alignSelf: 'center',
    width: 325,
    height: 600,
  },
  logo: {
    resizeMode: 'contain',
    height: 52,
    width: 40,
    marginLeft: -7
  },
  title: {
    fontFamily: 'CerebriSans-Bold',
    fontSize: 27,
    letterSpacing: -1.7,
    color: '#000',
    marginBottom: 35,
    marginTop: 10,
    marginLeft: 3
  },
  text: {
    fontFamily: 'CerebriSans-Regular',
    fontSize: 17,
    color: '#737880',
    textAlign: 'justify',
    marginBottom: 20,
  },
  bold: {
    fontFamily: 'CerebriSans-Bold',
  },
  inputWrapper: {
    height: 64,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#c9c9c9',
    justifyContent: 'center',
  },
  input: {
    fontFamily: 'CerebriSans-Medium',
    letterSpacing: -0.2,
    fontSize: 17,
    color: '#000',
    flex: 1,
    paddingLeft: 20,
  },
  buttonOnLabel: {
    fontFamily: 'CerebriSans-Medium',
    fontSize: 18,
    color: '#fff',
  },
  buttonOffLabel: {
    fontFamily: 'CerebriSans-Medium',
    fontSize: 18,
    color: '#5c5c5c',
  },
  button: {
    marginTop: 15,
    height: 60,
    borderRadius: 3.4,
    width: '45%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonOn: {
    backgroundColor: '#4585f5',
    flex: 1,
  },
  buttonOff: {
    backgroundColor: '#f2f2f2',
    flex: 1,
  },
  buttonWrapper: {
    flexDirection: 'row',
    marginTop: 15,
    // justifyContent: 'center'
  },
  buttonRight: {
    marginLeft: 10,
  },
  buttonLeft: {
    marginRight: 10,
  },
  grayBox: {
    backgroundColor: '#f7f7f7',
    padding: 23,
  },
  grayBoxText: {
    color: '#737880',
    fontSize: 17,
    fontFamily: 'CerebriSans-Regular',
  },
  signUp: {
    fontFamily: 'CerebriSans-Regular',
    textAlign: 'center',
    color: '#737880',
    fontSize: 15,
    marginTop: 10,
    padding: 20,
  },
});

const mapStateToProps = (state) => {
  return {
    ...state,
  };
};

export default ForgotComposed = compose(connect(mapStateToProps))(Forgot);
