import React from 'react'
import { createAppContainer, CreateNavigatorConfig, NavigationParams, NavigationRoute, NavigationRouteConfigMap, NavigationStackRouterConfig, NavigationState } from 'react-navigation';
import { createStackNavigator } from 'react-navigation-stack';
import { StackNavigationConfig, StackNavigationOptions, StackNavigationProp } from 'react-navigation-stack/lib/typescript/src/vendor/types';
import analytics from './helpers/lytics';
import Biometric from './screens/Biometric';
import CreateFolder from './screens/CreateFolder';
import FileExplorer from './screens/FileExplorer';
import Intro from './screens/Intro';
import Login from './screens/Login';
import Register from './screens/Register';
import Forgot from './screens/Forgot';
import OutOfSpace from './screens/OutOfSpace';
import Storage from './screens/Storage';
import StorageWebView from './screens/StorageWebView';
import Photos from './screens/Photos';
import PhotoGallery from './screens/PhotoGallery';
import EntryGateway from './screens/EntryGateway';

type RouteConfig = NavigationRouteConfigMap<StackNavigationOptions, StackNavigationProp<NavigationRoute<NavigationParams>, NavigationParams>, unknown>
type NavigatorOptions = CreateNavigatorConfig<StackNavigationConfig, NavigationStackRouterConfig, StackNavigationOptions, StackNavigationProp<NavigationRoute<NavigationParams>, NavigationParams>>

const routeConfig: RouteConfig = {
  EntryPoint: { screen: EntryGateway },
  Register: { screen: Register },
  Login: { screen: Login },
  Intro: { screen: Intro },
  Photos: { screen: Photos },
  PhotoGallery: { screen: PhotoGallery },
  FileExplorer: { screen: FileExplorer },
  Biometric: { screen: Biometric },
  CreateFolder: { screen: CreateFolder },
  Forgot: { screen: Forgot },
  OutOfSpace: { screen: OutOfSpace },
  Storage: { screen: Storage },
  StorageWebView: { screen: StorageWebView }
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

    analytics.screen(routeName)
  } catch {
  }
}

function AppNavigator(): JSX.Element {
  return <App onNavigationStateChange={trackScreen} />
}

export default AppNavigator