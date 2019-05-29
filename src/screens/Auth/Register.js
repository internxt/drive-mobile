import React, { Component } from "react";
import { compose } from "redux";
import { connect } from "react-redux";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableHighlight,
  Image,
  Alert
} from "react-native";
import { utils } from '../../helpers'

class Register extends Component {
  constructor() {
    super();

    this.state = {
      firstName: '',
      lastName: '',
      email: '',

      password: '',
      confirmPassword: '',

      registerStep: 1,
      isLoading: false
    };

  }

  isValidEmail = (email) => {
    let re = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
    return re.test(String(email).toLowerCase());
  }

  isStrongPassword = (pwd) => {
    let re = /^(?=.*[a-zA-Z])(?=.*[0-9]).{6,}$/
    return re.test(pwd);
  }

  isNullOrEmpty = (string) => {
    return !(string != null && string != undefined && string != '');
  }

  isValidStep1 = () => {
    if (this.isNullOrEmpty(this.state.firstName)) {
      Alert.alert('', 'Please enter your first name');
      return false;
    }

    if (this.isNullOrEmpty(this.state.lastName)) {
      Alert.alert('', 'Please enter your last name');
      return false;
    }

    if (!this.isValidEmail(this.state.email)) {
      Alert.alert('', 'Please enter a valid email address');
      return false;
    }

    return true;
  }

  isValidStep3 = () => {
    if (this.isNullOrEmpty(this.state.password)) {
      Alert.alert('', 'Please enter a valid password');
      return false;
    }

    if (!this.isStrongPassword(this.state.password)) {
      Alert.alert('', 'Please make sure your password contains at least six characters, a number, and a letter');
      return false;
    }

    if (this.state.password != this.state.confirmPassword) {
      Alert.alert('', 'Please make sure your passwords match');
      return false;
    }

    return true;
  }

  doRegister = () => {
    const hashObj = utils.passToHash({ password: this.state.password });
    const encPass = utils.encryptText(hashObj.hash);
    const encSalt = utils.encryptText(hashObj.salt);

    fetch(`${process.env.REACT_APP_API_URL}/api/temp`, {
      method: 'GET',
      headers: {
        "content-type": "application/json; charset=utf-8",
      }
    }).then(async res => {
      return { res, data: await res.json() };
    }).then(res => {
      if (res.res.status != 200) {
        throw { error: 'Could not connect to server' }
      } else {

        let mnemonicEncrypted = res.data.payload;
        let mnemonic = utils.decryptText(mnemonicEncrypted);
        const encMnemonic = utils.encryptTextWithKey(mnemonic, this.state.password);

        fetch(`${process.env.REACT_APP_API_URL}/api/register`, {
          method: 'POST',
          headers: {
            "content-type": "application/json; charset=utf-8",
          },
          body: JSON.stringify({
            name: this.state.firstName,
            lastname: this.state.lastName,
            email: this.state.email,
            password: encPass,
            mnemonic: encMnemonic,
            salt: encSalt
          })
        }).then(async res => {
          return { res, data: await res.json() };
        }).then(res => {
          if (res.res.status != 200) {
            Alert.alert('Server register error');
          } else {
            this.setState({ registerStep: 4 });
          }
        }).catch(err => {
          console.log(err);
          Alert.alert('Internal server error while registering Code: 2');
        });

      }
      this.setState({ isLoading: false });

    }).catch(err => {
      Alert.alert('Internal server error while registering Code: 1');
    });


  }

  render() {
    if (this.state.registerStep == 1) {
      return (
        <View style={styles.container}>
          <View style={styles.containerCentered}>
            <View style={styles.containerHeader}>
              <View style={styles.headerContainer}>
                <Image
                  style={styles.logo}
                  source={require("../../../assets/images/logo.png")}
                />
              </View>
              <Text style={styles.title}>Create an X Cloud account</Text>
              <View style={styles.buttonWrapper}>
                <TouchableHighlight style={styles.buttonOff} underlayColor="#4585f5" onPress={() => this.props.goToForm('SIGNIN')}>
                  <Text style={styles.buttonOffLabel}>Sign in</Text>
                </TouchableHighlight>
                <TouchableHighlight style={styles.buttonOn} underlayColor="#4585f5">
                  <Text style={styles.buttonOnLabel}>Create account</Text>
                </TouchableHighlight>
              </View>
            </View>
            <View style={styles.showInputFieldsWrapper}>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={this.state.firstName}
                  onChangeText={value => this.setState({ firstName: value })}
                  placeholder='First name'
                  placeholderTextColor="#666666"
                  maxLength={64}
                />
              </View>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={this.state.lastName}
                  onChangeText={value => this.setState({ lastName: value })}
                  placeholder='Last name'
                  placeholderTextColor="#666666"
                  maxLength={64}
                />
              </View>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={this.state.email}
                  onChangeText={value => this.setState({ email: value })}
                  placeholder='Email address'
                  placeholderTextColor="#666666"
                  maxLength={64}
                />
              </View>
            </View>
            <View style={styles.buttonFooterWrapper}>
              <TouchableHighlight
                style={styles.button}
                underlayColor="#4585f5"
                onPress={() => {
                  if (this.isValidStep1()) {
                    this.setState({ registerStep: 2 });
                  }
                }}>
                <Text style={styles.buttonOnLabel}>Continue</Text>
              </TouchableHighlight>
            </View>
          </View>
        </View>
      );
    }

    if (this.state.registerStep == 2) {
      return (
        <View style={styles.container}>
          <View style={styles.containerCentered}>
            <View style={styles.containerHeader}>
              <View style={styles.headerContainer}>
                <Image
                  style={styles.logo}
                  source={require("../../../assets/images/logo.png")}
                />
              </View>
              <Text style={styles.title}>X Cloud Security</Text>

              <View>
                <Text style={{ fontSize: 17, color: '#737880', fontFamily: 'CerebriSans-Regular', textAlign: 'justify', letterSpacing: -0.1, marginTop: -15 }}>X Cloud uses your password to encrypt and decrypt your files. Due to the secure nature of X Cloud, we don't know your password. That means that if you ever forget it, your files are gone forever. With us, you're the only owner of your files. We strongly suggest you to:</Text>
              </View>

              <View style={{ backgroundColor: '#f7f7f7', padding: 23, marginTop: 30 }}>
                <View style={{ flexDirection: 'row', marginBottom: 10 }}>
                  <Text>{'\u2022'}</Text>
                  <Text style={{ flex: 1, paddingLeft: 9, color: '#737880', fontSize: 17, fontFamily: 'CerebriSans-Regular' }}>Store your Password. Keep it safe and secure.</Text>
                </View>
                <View style={{ flexDirection: 'row' }}>
                  <Text>{'\u2022'}</Text>
                  <Text style={{ flex: 1, paddingLeft: 9, color: '#737880', fontSize: 17, fontFamily: 'CerebriSans-Regular' }}>Keep an offline backup of your password.</Text>
                </View>
              </View>

              <View style={[styles.buttonFooterWrapper, { marginTop: 35 }]}>
                <TouchableHighlight
                  style={styles.button}
                  underlayColor="#4585f5"
                  onPress={() => {
                    this.setState({ registerStep: 3 });
                  }}>
                  <Text style={styles.buttonOnLabel}>Continue</Text>
                </TouchableHighlight>
              </View>
            </View>
          </View>
        </View >
      );
    }


    if (this.state.registerStep == 3) {
      return (
        <View style={styles.container}>
          <View style={[styles.containerCentered, this.state.isLoading ? { opacity: 0.5 } : {}]}>
            <View style={styles.containerHeader}>
              <View style={styles.headerContainer}>
                <Image
                  style={styles.logo}
                  source={require("../../../assets/images/logo.png")}
                />
              </View>
              <Text style={styles.title}>Create an X Cloud account</Text>
            </View>
            <View style={[styles.showInputFieldsWrapper, { marginTop: -10 }]}>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={this.state.password}
                  onChangeText={value => this.setState({ password: value })}
                  placeholder='Password'
                  placeholderTextColor="#666666"
                  maxLength={64}
                  secureTextEntry={true}
                  textContentType="password"
                />
              </View>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={this.state.confirmPassword}
                  onChangeText={value => this.setState({ confirmPassword: value })}
                  placeholder='Confirm password'
                  placeholderTextColor="#666666"
                  maxLength={64}
                  secureTextEntry={true}
                  textContentType="password"
                />
              </View>
            </View>
            <View style={styles.buttonFooterWrapper}>
              <TouchableHighlight
                style={styles.button}
                underlayColor="#4585f5"
                onPress={() => {
                  if (this.state.isLoading) { return; }
                  this.setState({ isLoading: true });

                  if (this.isValidStep3()) {
                    this.doRegister();
                  } else {
                    this.setState({ isLoading: false });
                  }
                }}>
                <Text style={styles.buttonOnLabel}>{this.state.isLoading ? 'Creating your account...' : 'Continue'}</Text>
              </TouchableHighlight>
            </View>
          </View>
        </View>
      );
    }

    if (this.state.registerStep == 4) {
      return (
        <View style={styles.container}>
          <View style={styles.containerCentered}>
            <View style={styles.containerHeader}>
              <View style={styles.headerContainer}>
                <Image
                  style={styles.logo}
                  source={require("../../../assets/images/logo.png")}
                />
              </View>
              <Text style={styles.title}>Activation Email</Text>

              <View>
                <Text style={{ fontSize: 17, color: '#737880', fontFamily: 'CerebriSans-Regular', marginTop: -10 }}>Please check your email and follow the instructions to activate your account so you can start using X Cloud.</Text>
              </View>

              <View style={{ backgroundColor: '#f7f7f7', padding: 23, marginTop: 30 }}>
                <Text style={{ color: '#737880', fontSize: 17, fontFamily: 'CerebriSans-Regular' }}>By creating an account, you are agreeing to our Terms &amp; Conditions and Privacy Policy.</Text>
              </View>

              <View style={styles.buttonFooterWrapper}>
                <TouchableHighlight
                  style={[styles.button, { marginTop: 10 }]}
                  underlayColor="#4585f5"
                  onPress={() => {
                  }}>
                  <Text style={styles.buttonOnLabel}>Re-send activation email</Text>
                </TouchableHighlight>
              </View>

            </View>
          </View>
        </View >
      );
    }
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF'
  },
  containerCentered: {
    justifyContent: 'center',
    alignSelf: 'center',
    width: 325,
    height: 600
  },
  containerHeader: {
    borderWidth: 0
  },
  logo: {
    aspectRatio: 1.3,
    resizeMode: 'contain'
  },
  title: {
    fontFamily: "CerebriSans-Bold",
    fontSize: 27,
    letterSpacing: -1.7,
    color: "#000",
    marginBottom: 35,
    marginTop: 20
  },
  subtitle: {
    fontFamily: "CerebriSans-Medium",
    fontSize: 29,
    color: "#fff",
    opacity: 0.76
  },
  buttonWrapper: {
    display: "flex",
    flexDirection: 'row',
    alignItems: "center",
    marginBottom: 30
  },
  buttonFooterWrapper: {
    marginTop: 20
  },
  button: {
    alignSelf: "stretch",
    height: 60,
    borderRadius: 3.4,
    backgroundColor: "#4585f5",
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonOn: {
    alignSelf: "stretch",
    height: 60,
    borderRadius: 3.4,
    backgroundColor: "#4585f5",
    paddingLeft: 30,
    paddingRight: 30,
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonOff: {
    alignSelf: "stretch",
    height: 60,
    borderRadius: 3.4,
    backgroundColor: "#f2f2f2",
    paddingLeft: 30,
    paddingRight: 30,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonOnLabel: {
    fontFamily: "CerebriSans-Medium",
    fontSize: 18,
    textAlign: "center",
    color: "#fff"
  },
  buttonOffLabel: {
    fontFamily: "CerebriSans-Medium",
    fontSize: 18,
    textAlign: "center",
    color: "#5c5c5c"
  },
  redirectMessage: {
    fontFamily: "CerebriSans-Medium",
    fontSize: 14,
    letterSpacing: 0.3,
    color: "#fff",
    opacity: 0.6
  },
  input: {
    fontFamily: "CerebriSans-Medium",
    letterSpacing: -0.2,
    fontSize: 17,
    color: "#000"
  },
  showInputFieldsWrapper: {
    justifyContent: 'center'
  },
  hideInputFieldWrapper: {
    display: 'none'
  },
  inputWrapper: {
    height: 64,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#c9c9c9",
    justifyContent: 'center',
    paddingLeft: 20,
    paddingRight: 20,
    marginBottom: 15
  }
});

const mapStateToProps = state => {
  return {
    ...state
  };
};

export default (RegisterComposed = compose(connect(mapStateToProps))(Register));
