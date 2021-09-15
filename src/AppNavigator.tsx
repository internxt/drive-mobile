import React from 'react'
import { NavigationParams, NavigationRoute, NavigationRouteConfigMap } from 'react-navigation';
import { StackNavigationOptions, StackNavigationProp } from 'react-navigation-stack/lib/typescript/src/vendor/types';
import CreateFolder from './screens/CreateFolder';
import Intro from './screens/Intro';
import Login from './screens/Login';
import Register from './screens/Register';
import Forgot from './screens/Forgot';
import OutOfSpace from './screens/OutOfSpace';
import Storage from './screens/Storage';
import StorageWebView from './screens/StorageWebView';
import EntryGateway from './screens/EntryGateway';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TabExplorer from './screens/TabExplorer';
import Billing from './screens/Billing';
import ChangePassword from './screens/ChangePassword';

type RouteConfig = NavigationRouteConfigMap<StackNavigationOptions, StackNavigationProp<NavigationRoute<NavigationParams>, NavigationParams>, any>

const routeConfig: RouteConfig = {
  EntryPoint: { screen: EntryGateway },
  Register: { screen: Register },
  Login: { screen: Login },
  Intro: { screen: Intro },
  FileExplorer: { screen: TabExplorer },
  CreateFolder: { screen: CreateFolder },
  Forgot: { screen: Forgot },
  OutOfSpace: { screen: OutOfSpace },
  Storage: { screen: Storage },
  StorageWebView: { screen: StorageWebView },
  Billing: { screen: Billing },
  ChangePassword: { screen: ChangePassword }
};

const StackNav = createNativeStackNavigator();

type ScreenEntry = [name: string, component: { screen: React.ComponentType<JSX.Element> }];

function AppNavigator(): JSX.Element {
  return <StackNav.Navigator
    initialRouteName='FileExplorer'
    screenOptions={{ headerShown: false, statusBarHidden: false }}>
    {Object.entries(routeConfig).map(([name, component]: ScreenEntry) => (
      <StackNav.Screen key={name} name={name} component={component.screen} />
    ))}
  </StackNav.Navigator>;
}

export default AppNavigator