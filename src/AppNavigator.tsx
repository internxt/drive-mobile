import React, { useEffect } from 'react'
import { createAppContainer, CreateNavigatorConfig, NavigationParams, NavigationRoute, NavigationRouteConfigMap, NavigationStackRouterConfig } from 'react-navigation';
import { createStackNavigator } from 'react-navigation-stack';
import { StackNavigationConfig, StackNavigationOptions, StackNavigationProp } from 'react-navigation-stack/lib/typescript/src/vendor/types';
import { connect } from 'react-redux';
import Auth from './screens/Auth'
import Biometric  from './screens/Biometric';
import FileExplorer from './screens/FileExplorer';
import Intro from './screens/Intro';
import Login from './screens/Login';
import Register from './screens/Register';


type RouteConfig = NavigationRouteConfigMap<StackNavigationOptions, StackNavigationProp<NavigationRoute<NavigationParams>, NavigationParams>, unknown>
type NavigatorOptions = CreateNavigatorConfig<StackNavigationConfig, NavigationStackRouterConfig, StackNavigationOptions, StackNavigationProp<NavigationRoute<NavigationParams>, NavigationParams>>

const routeConfig: RouteConfig  = {
  Auth: { screen: Auth },
  Register: { screen: Register },
  Login: { screen: Login },
  Intro: { screen: Intro },
  FileExplorer: { screen: FileExplorer },
  Biometric: { screen: Biometric }
};

const navigatorOptions: NavigatorOptions = {
  initialRouteName: 'Biometric',
  headerMode: 'none'
};

const StackNav = createStackNavigator(routeConfig, navigatorOptions);
const App = createAppContainer(StackNav);

function AppNavigator(props: any) {
  return <App />
}

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(AppNavigator)