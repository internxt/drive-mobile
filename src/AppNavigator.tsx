import React from 'react'
import { createAppContainer, CreateNavigatorConfig, NavigationParams, NavigationRoute, NavigationRouteConfigMap, NavigationStackRouterConfig, NavigationState } from 'react-navigation';
import { createStackNavigator } from 'react-navigation-stack';
import { StackNavigationConfig, StackNavigationOptions, StackNavigationProp } from 'react-navigation-stack/lib/typescript/src/vendor/types';
import { connect } from 'react-redux';
import analytics from './helpers/lytics';
import Biometric from './screens/Biometric';
import CreateFolder from './screens/CreateFolder';
import FileExplorer from './screens/FileExplorer';
import Intro from './screens/Intro';
import Login from './screens/Login';
import Register from './screens/Register';
import Forgot from './screens/Forgot';



type RouteConfig = NavigationRouteConfigMap<StackNavigationOptions, StackNavigationProp<NavigationRoute<NavigationParams>, NavigationParams>, unknown>
type NavigatorOptions = CreateNavigatorConfig<StackNavigationConfig, NavigationStackRouterConfig, StackNavigationOptions, StackNavigationProp<NavigationRoute<NavigationParams>, NavigationParams>>

const routeConfig: RouteConfig = {
  Register: { screen: Register },
  Login: { screen: Login },
  Intro: { screen: Intro },
  FileExplorer: { screen: FileExplorer },
  Biometric: { screen: Biometric },
  CreateFolder: { screen: CreateFolder },
  Forgot: { screen: Forgot }
};

const navigatorOptions: NavigatorOptions = {
  initialRouteName: 'Login',
  headerMode: 'none'
};

const StackNav = createStackNavigator(routeConfig, navigatorOptions);
const App = createAppContainer(StackNav);

function trackScreen(previousScreen: NavigationState, nextScreen: NavigationState) {
  try {
    const routeName = nextScreen.routes[0].routeName
    console.log('Route', routeName)
    analytics.screen(routeName)
  } catch {

  }
}

function AppNavigator(props: any) {
  return <App onNavigationStateChange={trackScreen} />
}

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(AppNavigator)