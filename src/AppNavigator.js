import React, { Component } from "react";
import { createStackNavigator } from "react-navigation";

import Home from "./screens/Home/Home";
import SignIn from "./screens/SignIn/SignIn";
import Settings from "./screens/Settings/Settings";
import SubscriptionDetails from "./screens/Settings/SubscriptionDetails";
import CreateFolder from "./screens/CreateFolder/CreateFolder";

const routeConfig = {
  Home: { screen: Home },
  SignIn: { screen: SignIn },
  Settings: { screen: Settings },
  SubscriptionDetails: { screen: SubscriptionDetails },
  CreateFolder: { screen: CreateFolder }
};

const navigatorOptions = {
  initialRouteName: "SignIn",
  headerMode: "none"
};

const StackNav = createStackNavigator(routeConfig, navigatorOptions);

class AppNavigator extends Component {
  render() {
    return <StackNav />;
  }
}

export default AppNavigator;
