import React, { Component } from "react";
import { createStackNavigator } from "react-navigation";

import Home from "./screens/Home";
import Auth from "./screens/Auth";
import Settings from "./screens/Settings";
import SubscriptionDetails from "./screens/Settings/SubscriptionDetails";
import CreateFolder from "./screens/CreateFolder";

const routeConfig = {
  Home: { screen: Home },
  Auth: { screen: Auth },
  Settings: { screen: Settings },
  SubscriptionDetails: { screen: SubscriptionDetails },
  CreateFolder: { screen: CreateFolder }
};

const navigatorOptions = {
  initialRouteName: "Auth",
  headerMode: "none"
};

const StackNav = createStackNavigator(routeConfig, navigatorOptions);

class AppNavigator extends Component {
  render() {
    return <StackNav />;
  }
}

export default AppNavigator;
