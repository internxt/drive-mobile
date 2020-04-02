import React, { Component } from 'react';
import { createAppContainer } from 'react-navigation';
import { createStackNavigator } from 'react-navigation-stack';

import Home from './screens/Home';
import Auth from './screens/Auth';
import CreateFolder from './screens/CreateFolder';

const routeConfig = {
  Home: { screen: Home },
  Auth: { screen: Auth },
  CreateFolder: { screen: CreateFolder }
};

const navigatorOptions = {
  initialRouteName: 'Auth',
  headerMode: 'none'
};

const StackNav = createStackNavigator(routeConfig, navigatorOptions);
const App = createAppContainer(StackNav);

class AppNavigator extends Component {
  render() {
    return <App />;
  }
}

export default AppNavigator;
