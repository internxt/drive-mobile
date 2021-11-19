import React from 'react';
import { NavigationParams, NavigationRoute, NavigationRouteConfigMap } from 'react-navigation';
import { StackNavigationOptions, StackNavigationProp } from 'react-navigation-stack/lib/typescript/src/vendor/types';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import CreateFolder from './screens/CreateFolderScreen';
import Intro from './screens/IntroScreen';
import Login from './screens/SignInScreen';
import Register from './screens/SignUpScreen';
import Forgot from './screens/ForgotPasswordScreen';
import OutOfSpace from './screens/OutOfSpaceScreen';
import Storage from './screens/StorageScreen';
import TabExplorer from './layouts/TabExplorer';
import Billing from './screens/BillingScreen';
import ChangePassword from './screens/ChangePasswordScreen';
import RecoverPassword from './screens/RecoverPasswordScreen';
import UpdateModal from './components/modals/UpdateModal';
import Preview from './screens/PhotosScreen/Preview';

type RouteConfig = NavigationRouteConfigMap<
  StackNavigationOptions,
  StackNavigationProp<NavigationRoute<NavigationParams>, NavigationParams>,
  any
>;

const routeConfig: RouteConfig = {
  Register: { screen: Register },
  Login: { screen: Login },
  Intro: { screen: Intro },
  FileExplorer: { screen: TabExplorer },
  CreateFolder: { screen: CreateFolder },
  Forgot: { screen: Forgot },
  OutOfSpace: { screen: OutOfSpace },
  Storage: { screen: Storage },
  Billing: { screen: Billing },
  ChangePassword: { screen: ChangePassword },
  RecoverPassword: { screen: RecoverPassword },
  Preview: { screen: Preview },
};

const StackNav = createNativeStackNavigator();

type ScreenEntry = [name: string, component: { screen: React.ComponentType<JSX.Element> }];

function AppNavigator(): JSX.Element {
  return (
    <>
      <UpdateModal />
      <StackNav.Navigator
        initialRouteName="FileExplorer"
        screenOptions={{ headerShown: false, statusBarHidden: false }}
      >
        {Object.entries(routeConfig).map(([name, component]: ScreenEntry) => (
          <StackNav.Screen key={name} name={name} component={component.screen} />
        ))}
      </StackNav.Navigator>
    </>
  );
}

export default AppNavigator;
