import React, { Component } from "react";
import { compose } from "redux";
import { connect } from "react-redux";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableHighlight,
  Alert,
  Image
} from "react-native";
import { utils } from './../../helpers'

class SignIn extends Component {
  constructor() {
    super();
    this.state = {
      email: '',
      pasword: '',
      showTwoFactor: false,
      twoFactorCode: ''
    };
  }

  validateForm = () => {
    // Validate email
    let emailPattern = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
    let emailValid = emailPattern.test(String(this.state.email).toLowerCase());
    // Validate pass
    let passValid = this.state.pasword.length >= 5;

    return (emailValid && passValid);
  }

  validateTwoFactorCode = () => {
    return /^[0-9]{6}$/.test(this.state.twoFactorCode);
  }

  check2FA = () => {
    if (!this.validateForm()) {
      console.log('Form not filled');
      Alert.alert('Login failure', 'Invalid user data');
      this.setState({ showTwoFactor: false });
      return;
    }

    if (this.state.showTwoFactor && !this.validateTwoFactorCode()) {
      Alert.alert('Error', 'Two factor code not valid');
      return;
    }

    fetch(`${process.env.REACT_APP_API_URL}/api/login`, {
      method: 'POST',
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ email: this.state.email })
    })
      .then(async res => {
        return { res, data: await res.json() }
      })

      .then(async res => {
        if (res.res.status === 200) {
          // Manage login depending on 2FA activated or not
          if (!res.data.tfa || this.state.showTwoFactor) {
            console.log('2FA not needed or already established, performing regular login...');

            // Check initialization

            try {
              const salt = utils.decryptText(res.data.sKey);
              const hashObj = utils.passToHash({ password: this.state.pasword, salt });
              const encPass = utils.encryptText(hashObj.hash);

              var activation = fetch(`${process.env.REACT_APP_API_URL}/api/access`, {
                method: "POST",
                headers: { "content-type": "application/json; charset=utf-8" },
                body: JSON.stringify({
                  email: this.state.email,
                  password: encPass,
                  tfa: this.state.twoFactorCode
                })
              })
                .then(async response => {
                  return { response, data: await response.json() }
                }).then(resp => {
                  if (!resp.data.user.root_folder_id || true) {
                    // No root folder, create one

                    const mnemonicEncrypted = resp.data.user.mnemonic;
                    const mnemonicDecrypted = utils.decryptTextWithKey(mnemonicEncrypted, this.state.pasword);

                    fetch(`${process.env.REACT_APP_API_URL}/api/initialize`, {
                      method: 'POST',
                      headers: {
                        "Authorization": `Bearer ${resp.data.token}`,
                        "internxt-mnemonic": mnemonicDecrypted,
                        "Content-type": "application/json"
                      },
                      body: JSON.stringify({
                        email: this.state.email,
                        mnemonic: mnemonicDecrypted
                      })
                    })

                  }
                })

            } catch (error) { console.log(error); }

            if (activation) { await activation; }

            // Regular login
            this.props.onSignInClick(this.state.email, this.state.pasword, res.data.sKey, this.state.twoFactorCode);
          } else {
            // 2FA login
            console.log('Need 2FA code to login');
            this.setState({ showTwoFactor: true });
          }
        } else {
          // Error on login (Propagate exception to show alert on catch block)
          throw { error: res.data.error ? res.data.error : 'Internal error' };
        }
      }).catch(err => {
        console.log(err);
        Alert.alert('Login failed', err.error);
      });
  }

  componentWillReceiveProps(newProps) {
    if (newProps.authenticationState.error) {
      Alert.alert('Login failed', newProps.authenticationState.error);
    }
  }

  render() {
    return (
      <View style={styles.container}>
        <View style={styles.containerCentered}>
          <View style={styles.containerHeader}>
            <View>
              <Image
                style={styles.logo}
                source={require("../../../assets/images/logo.png")}
              />
            </View>
            <Text style={styles.title}>Sign in to X Cloud</Text>
            <View style={styles.buttonWrapper}>
              <TouchableHighlight style={styles.buttonOn} underlayColor="#00aaff">
                <Text style={styles.buttonOnLabel}>Sign in</Text>
              </TouchableHighlight>
              <TouchableHighlight style={styles.buttonOff} underlayColor="#00aaff" onPress={() => this.props.goToForm('REGISTER')}>
                <Text style={styles.buttonOffLabel}>Create account</Text>
              </TouchableHighlight>
            </View>
          </View>
          <View style={this.state.showTwoFactor ? styles.hideInputFieldWrapper : styles.showInputFieldsWrapper}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={this.state.email}
                onChangeText={value => this.setState({ email: value })}
                placeholder='Email address'
                placeholderTextColor="#666666"
                maxLength={64}
                keyboardType="email-address"
                textContentType="emailAddress"
              />
            </View>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={this.state.pasword}
                onChangeText={value => this.setState({ pasword: value })}
                placeholder='Password'
                placeholderTextColor="#666666"
                maxLength={64}
                secureTextEntry={true}
                textContentType="password"
              />
            </View>
          </View>
          <View style={this.state.showTwoFactor ? styles.showInputFieldsWrapper : styles.hideInputFieldWrapper}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={this.state.twoFactorCode}
                onChangeText={value => this.setState({ twoFactorCode: value })}
                placeholder='Two-factor code'
                placeholderTextColor="#666666"
                maxLength={64}
                keyboardType="numeric"
                textContentType="none" />
            </View>
          </View>
          <View style={styles.buttonFooterWrapper}>
            <TouchableHighlight
              style={styles.button}
              underlayColor="#00aaff"
              onPress={this.check2FA}>
              <Text style={styles.buttonOnLabel}>Sign in</Text>
            </TouchableHighlight>
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
    marginLeft: 10,
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

export default (SignInComposed = compose(connect(mapStateToProps))(SignIn));
