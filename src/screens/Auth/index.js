import React, { Component } from "react";
import { compose } from "redux";
import { connect } from "react-redux";
import {
  StyleSheet
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

  async UNSAFE_componentWillMount() {
    // Check if exists user login info on device storage
    const token = await deviceStorage.getItem('xToken');
    const user = JSON.parse(await deviceStorage.getItem('xUser'));

    if (token && user) {
      this.props.dispatch(userActions.localSignIn(token, user));
    }
  }

  // Manage new props recieved from parent
  UNSAFE_componentWillReceiveProps(nextProps) {

    if (nextProps.authenticationState.loggedIn !== this.state.loggedIn) {
      this.setState({
        loggedIn: nextProps.authenticationState.loggedIn,
        user: nextProps.authenticationState.user
      });

      // Redirect user if signed in & getFolderContent for user root_folder_id
      if (nextProps.authenticationState.loggedIn) {
        this.props.dispatch(
          fileActions.getFolderContent(nextProps.authenticationState.user.root_folder_id)
        );
        this.props.navigation.replace("Home", {
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
    if (this.state.screen === 'SIGNIN') {
      return <SignIn onSignInClick={this.onSignInClick} goToForm={this.goToForm} />;
    }

    if (this.state.screen === 'REGISTER') {
      return <Register onRegisterClick={this.onRegisterClick} goToForm={this.goToForm} />;
    }
  }
}

const styles = StyleSheet.create({
});

const mapStateToProps = state => {
  return {
    ...state
  };
};

export default (AuthComposed = compose(connect(mapStateToProps))(Auth));
