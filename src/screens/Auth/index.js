import React, { Component } from "react";
import { compose } from "redux";
import { connect } from "react-redux";
import {
  StyleSheet,
  View,
  Image
} from "react-native";

import SignIn from "./SignIn";
import Register from "./Register";
import { userActions, fileActions } from "../../actions";
import { deviceStorage } from "../../helpers";

class Auth extends Component {
  constructor() {
    super();

    this.state = {
      loggedIn: false,
      user: {},
      screen: 'SIGNIN'
    };
  }

  async componentWillMount() {
    // Check if exists user login info on device storage
    const token = await deviceStorage.getItem('xToken');
    const user = JSON.parse(await deviceStorage.getItem('xUser'));

    if (token && user) {
      this.props.dispatch(userActions.localSignIn(token, user));
    }
  }

  // Manage new props recieved from parent
  componentWillReceiveProps(nextProps) {
    if (nextProps.authenticationState.loggedIn !== this.state.loggedIn) {
      this.setState({
        loggedIn: nextProps.authenticationState.loggedIn,
        user: nextProps.authenticationState.user
      });

      // Redirect user if signed in & getFolderContent for user root_folder_id
      if (nextProps.authenticationState.loggedIn) {
        this.props.dispatch(
          fileActions.getFolderContent(
            nextProps.authenticationState.user.root_folder_id
          )
        );
        this.props.navigation.push("Home", {
          folderId: nextProps.authenticationState.user.root_folder_id
        });
      }
    }
  }

  goToForm = (value) => {
    this.setState({ screen: value });
  }

  onSignInClick = (email, pass, sKey, twoFactorCode) => {
    this.props.dispatch(userActions.signin(email, pass, sKey, twoFactorCode));
  }

  onRegisterClick = () => {
    // MANAGE REGISTER
  }

  render() {
    return (
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Image
            style={styles.logo}
            source={require("../../../assets/images/logo.png")}
          />
        </View>
        <View style={styles.formContainer}>
          {(this.state.screen === 'SIGNIN') && (
            <SignIn onSignInClick={this.onSignInClick} goToForm={this.goToForm} />
          )}
          {(this.state.screen === 'REGISTER') && (
            <Register onRegisterClick={this.onRegisterClick} goToForm={this.goToForm} />
          )}
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    padding: 20
  },
  headerContainer: {
    flex: 0.15
  },
  formContainer: {
    flex: 0.9
  },
  logo: {
    height: 29.1,
    width: 55.4,
    marginTop: 70
  },
  title: {
    fontFamily: "CerebriSans-Bold",
    fontSize: 27,
    letterSpacing: -1.7,
    color: "#000",
    marginTop: 15,
    marginBottom: 35
  },
  subtitle: {
    fontFamily: "CerebriSans-Medium",
    fontSize: 29,
    color: "#fff",
    opacity: 0.76
  }
});

const mapStateToProps = state => {
  return {
    ...state
  };
};

export default (AuthComposed = compose(connect(mapStateToProps))(Auth));
