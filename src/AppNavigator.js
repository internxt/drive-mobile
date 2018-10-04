import React, { Component } from "react";
import { createStackNavigator } from "react-navigation";

import Home from "./screens/Home/Home";
import SignIn from "./screens/SignIn/SignIn";

const routeConfig = {
  Home: { screen: Home },
  SignIn: { screen: SignIn }
};

const navigatorOptions = {
  initialRouteName: "Home", // TODO: Change to "SignIn" after authentication is implemented
  headerMode: "none"
};

const StackNav = createStackNavigator(routeConfig, navigatorOptions);

class AppNavigator extends Component {
  render() {
    return <StackNav />;
  }
}

export default AppNavigator;
