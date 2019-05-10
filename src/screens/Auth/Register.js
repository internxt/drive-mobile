import React, { Component } from "react";
import { compose } from "redux";
import { connect } from "react-redux";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableHighlight,
  Image
} from "react-native";

class Register extends Component {
  constructor() {
    super();

    this.state = {
      firstName: '',
      lastName: '',
      email: '',

      pasword: '',
      registerStep: 1
    };

  }

  render() {
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
            <Text style={styles.title}>Create X Cloud account</Text>
            <View style={styles.buttonWrapper}>
              <TouchableHighlight style={styles.buttonOff} underlayColor="#00aaff" onPress={() => this.props.goToForm('SIGNIN')}>
                <Text style={styles.buttonOffLabel}>Sign in</Text>
              </TouchableHighlight>
              <TouchableHighlight style={styles.buttonOn} underlayColor="#00aaff">
                <Text style={styles.buttonOnLabel}>Create account</Text>
              </TouchableHighlight>
            </View>
          </View>
          <View style={this.state.showTwoFactor ? styles.hideInputFieldWrapper : styles.showInputFieldsWrapper}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={this.state.name}
                onChangeText={value => this.setState({ name: value })}
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
              underlayColor="#00aaff"
              onPress={null}>
              <Text style={styles.buttonOnLabel}>Continue</Text>
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
