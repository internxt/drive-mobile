import React, { Component } from "react";
import { createStackNavigator } from "react-navigation";

import Home from "./screens/Home";
import Auth from "./screens/Auth";
import Storage from "./screens/Storage";
import SubscriptionDetails from "./screens/Storage/SubscriptionDetails";
import CreateFolder from "./screens/CreateFolder";

const routeConfig = {
  Home: { screen: Home },
  Auth: { screen: Auth },
  Storage: { screen: Storage },
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
