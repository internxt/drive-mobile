import React, { Component } from "react";
import { compose } from "redux";
import { connect } from "react-redux";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableHighlight,
  Alert
} from "react-native";

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

  check2FA = () => {
    if (!this.validateForm()) {
      console.log('Form not filled');
      Alert.alert('Login failure', 'Invalid user data');
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
      .then(res => {
        if (res.res.status === 200) {
          // Manage login depending on 2FA activated or not
          if (!res.data.tfa) {
            console.log('2FA not needed, performing regular login...');
            // Regular login
            this.props.onSignInClick(this.state.email, this.state.pasword, res.data.sKey, this.state.twoFactorCode);
          } else {
            // 2FA login
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

  render() {
    return (
      <View style={styles.container}>
        <Text style={styles.title}> Sign in to X Cloud</Text>
        <View style={styles.buttonWrapper}>
          <TouchableHighlight style={styles.buttonOn} underlayColor="#00aaff">
            <Text style={styles.buttonOnLabel}>Sign in</Text>
          </TouchableHighlight>
          <TouchableHighlight style={styles.buttonOff} underlayColor="#00aaff" onPress={() => this.props.goToForm('REGISTER')}>
            <Text style={styles.buttonOffLabel}>Create account</Text>
          </TouchableHighlight>
        </View>
        <View style={styles.inputFieldsWrapper}>
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
        <View style={styles.buttonFooterWrapper}>
          <TouchableHighlight
            style={styles.button}
            underlayColor="#00aaff"
            onPress={this.check2FA}
          >
            <Text style={styles.buttonOnLabel}>Sign in</Text>
          </TouchableHighlight>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  logo: {
    height: 52.4,
    width: 99,
    marginTop: 10
  },
  title: {
    fontFamily: "CerebriSans-Bold",
    fontSize: 27,
    color: "#000",
    marginTop: 15,
    marginBottom: 35
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  inputFieldsWrapper: {
    marginBottom: 20
  },
  inputWrapper: {
    height: 64,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#c9c9c9",
    paddingTop: 20,
    paddingBottom: 20,
    paddingLeft: 10,
    paddingRight: 10,
    marginTop: 15,
    marginBottom: 15
  }
});

const mapStateToProps = state => {
  return {
    ...state
  };
};

export default (SignInComposed = compose(connect(mapStateToProps))(SignIn));
