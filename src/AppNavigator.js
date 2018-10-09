import React, { Component } from "react";
import { createStackNavigator } from "react-navigation";

import Home from "./screens/Home/Home";
import SignIn from "./screens/SignIn/SignIn";
import Settings from "./screens/Settings/Settings";

const routeConfig = {
  Home: { screen: Home },
  SignIn: { screen: SignIn },
  Settings: { screen: Settings }
};

const navigatorOptions = {
  initialRouteName: "Settings", // TODO: Change to "SignIn" after authentication is implemented
  headerMode: "none"
};

const StackNav = createStackNavigator(routeConfig, navigatorOptions);

class AppNavigator extends Component {
  render() {
    return <StackNav />;
  }
}

export default AppNavigator;
