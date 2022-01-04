import React from 'react';
import { NavigationParams, NavigationRoute, NavigationRouteConfigMap } from 'react-navigation';
import { StackNavigationOptions, StackNavigationProp } from 'react-navigation-stack/lib/typescript/src/vendor/types';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AppScreen } from './types';
import UpdateModal from './components/modals/UpdateModal';
import CreateFolderScreen from './screens/CreateFolderScreen';
import SignInScreen from './screens/SignInScreen';
import SignUpScreen from './screens/SignUpScreen';
import IntroScreen from './screens/IntroScreen';
import HomeScreen from './screens/HomeScreen';
import OutOfSpaceScreen from './screens/OutOfSpaceScreen';
import StorageScreen from './screens/StorageScreen';
import AuthenticatedNavigator from './screens/AuthenticatedNavigator';
import BillingScreen from './screens/BillingScreen';
import ChangePasswordScreen from './screens/ChangePasswordScreen';
import RecoverPasswordScreen from './screens/RecoverPasswordScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import PhotosNavigator from './screens/PhotosNavigator';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { layoutActions } from './store/slices/layout';
import LinkCopiedModal from './components/modals/LinkCopiedModal';

type RouteConfig = NavigationRouteConfigMap<
  StackNavigationOptions,
  StackNavigationProp<NavigationRoute<NavigationParams>, NavigationParams>,
  any
>;

const routeConfig: RouteConfig = {
  [AppScreen.SignUp]: { screen: SignUpScreen },
  [AppScreen.SignIn]: { screen: SignInScreen },
  [AppScreen.Intro]: { screen: IntroScreen },
  [AppScreen.Home]: { screen: HomeScreen },
  [AppScreen.TabExplorer]: { screen: AuthenticatedNavigator },
  [AppScreen.CreateFolder]: { screen: CreateFolderScreen },
  [AppScreen.ForgotPassword]: { screen: ForgotPasswordScreen },
  [AppScreen.OutOfSpace]: { screen: OutOfSpaceScreen },
  [AppScreen.Storage]: { screen: StorageScreen },
  [AppScreen.Billing]: { screen: BillingScreen },
  [AppScreen.ChangePassword]: { screen: ChangePasswordScreen },
  [AppScreen.RecoverPassword]: { screen: RecoverPasswordScreen },
  [AppScreen.Photos]: { screen: PhotosNavigator },
};

const StackNav = createNativeStackNavigator();

function AppNavigator(): JSX.Element {
  const dispatch = useAppDispatch();
  const isLoggedIn = useAppSelector((state) => state.auth.loggedIn);
  const initialRouteName = isLoggedIn ? AppScreen.TabExplorer : AppScreen.SignIn;
  const isLinkCopiedModalOpen = useAppSelector((state) => state.layout.isLinkCopiedModalOpen);
  const onLinkCopiedModalClosed = () => {
    dispatch(layoutActions.setIsLinkCopiedModalOpen(false));
  };

  return (
    <>
      <UpdateModal />
      <LinkCopiedModal isOpen={isLinkCopiedModalOpen} onClosed={onLinkCopiedModalClosed} />

      <StackNav.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{ headerShown: false, statusBarHidden: false }}
      >
        {Object.entries(routeConfig).map(([name, component]: [string, any]) => (
          <StackNav.Screen key={name} name={name} component={component.screen} />
        ))}
      </StackNav.Navigator>
    </>
  );
}

export default AppNavigator;
