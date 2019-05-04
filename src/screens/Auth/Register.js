import React, { Component } from "react";
import { compose } from "redux";
import { connect } from "react-redux";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableHighlight
} from "react-native";

class Register extends Component {
  constructor() {
    super();

    this.state = {
      email: '',
      pasword: ''
    };

  }

  render() {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Create X Cloud account</Text>
        <View style={styles.buttonWrapper}>
          <TouchableHighlight
            style={styles.buttonOff}
            underlayColor="#00aaff"
            onPress={() => this.props.goToForm('SIGNIN')}>
            <Text style={styles.buttonOffLabel}>Sign in</Text>
          </TouchableHighlight>
          <TouchableHighlight
            style={styles.buttonOn}
            underlayColor="#00aaff"
          >
            <Text style={styles.buttonOnLabel}>Create account</Text>
          </TouchableHighlight>
        </View>
        <View style={styles.inputFieldsWrapper}>
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
          >
            <Text style={styles.buttonOnLabel}>Continue</Text>
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
    letterSpacing: -1.7,
    color: "#000",
    marginTop: 15,
    marginBottom: 35
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

export default (RegisterComposed = compose(connect(mapStateToProps))(Register));
