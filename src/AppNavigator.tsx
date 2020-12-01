import React from 'react'
import { createAppContainer, CreateNavigatorConfig, NavigationParams, NavigationRoute, NavigationRouteConfigMap, NavigationStackRouterConfig } from 'react-navigation';
import { createStackNavigator } from 'react-navigation-stack';
import { StackNavigationConfig, StackNavigationOptions, StackNavigationProp } from 'react-navigation-stack/lib/typescript/src/vendor/types';
import Auth from './screens/Auth'
import Login from './screens/Login';
import Register from './screens/Register';

type RouteConfig = NavigationRouteConfigMap<StackNavigationOptions, StackNavigationProp<NavigationRoute<NavigationParams>, NavigationParams>, unknown>
type NavigatorOptions = CreateNavigatorConfig<StackNavigationConfig, NavigationStackRouterConfig, StackNavigationOptions, StackNavigationProp<NavigationRoute<NavigationParams>, NavigationParams>>

const routeConfig: RouteConfig  = {
  Auth: { screen: Auth },
  Register: { screen: Register },
  Login: { screen: Login }
};

const navigatorOptions: NavigatorOptions = {
  initialRouteName: 'Login',
  headerMode: 'none'
};

const StackNav = createStackNavigator(routeConfig, navigatorOptions);
const App = createAppContainer(StackNav);

export default function AppNavigator() {
  return <App />
}