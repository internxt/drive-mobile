import React, { useEffect } from 'react';
import { NavigationParams, NavigationRoute, NavigationRouteConfigMap } from 'react-navigation';
import { StackNavigationOptions, StackNavigationProp } from 'react-navigation-stack/lib/typescript/src/vendor/types';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';

import { AppScreen } from '../types';
import UpdateModal from '../components/modals/UpdateModal';
import CreateFolderScreen from './CreateFolderScreen';
import SignInScreen from './SignInScreen';
import SignUpScreen from './SignUpScreen';
import IntroScreen from './IntroScreen';
import HomeScreen from './HomeScreen';
import OutOfSpaceScreen from './OutOfSpaceScreen';
import StorageScreen from './StorageScreen';
import AuthenticatedNavigator from './AuthenticatedNavigator';
import BillingScreen from './BillingScreen';
import ChangePasswordScreen from './ChangePasswordScreen';
import RecoverPasswordScreen from './RecoverPasswordScreen';
import ForgotPasswordScreen from './ForgotPasswordScreen';
import PhotosNavigator from './PhotosNavigator';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { layoutActions } from '../store/slices/layout';
import LinkCopiedModal from '../components/modals/LinkCopiedModal';
import PhotosPreviewScreen from './PhotosNavigator/PhotosPreviewScreen';
import { trackPayment } from '../services/analytics';
import { paymentsActions } from '../store/slices/payments';
import { appThunks } from '../store/slices/app';

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
  [AppScreen.PhotosPreview]: { screen: PhotosPreviewScreen },
};

const StackNav = createNativeStackNavigator();

function AppNavigator(): JSX.Element {
  const dispatch = useAppDispatch();
  const isLoggedIn = useAppSelector((state) => state.auth.loggedIn);
  const sessionId = useAppSelector((state) => state.payments.sessionId);
  const initialRouteName = isLoggedIn ? AppScreen.TabExplorer : AppScreen.SignIn;
  const isLinkCopiedModalOpen = useAppSelector((state) => state.layout.isLinkCopiedModalOpen);
  const onLinkCopiedModalClosed = () => {
    dispatch(layoutActions.setIsLinkCopiedModalOpen(false));
  };
  const onAppLinkOpened = (event: Linking.EventType) => {
    console.log('LINKING OPENED URL: ', event);
  };

  useEffect(() => {
    Linking.addEventListener('url', onAppLinkOpened);

    if (isLoggedIn) {
      const comesFromCheckout = !!sessionId;

      if (comesFromCheckout) {
        console.log('AppNavigator comesFromCheckout: ', sessionId);
        trackPayment(sessionId)
          .then((res) => {
            // no op
          })
          .catch((err) => {
            // no op
          })
          .finally(() => {
            dispatch(paymentsActions.setSessionId(''));
          });
      }
    }

    dispatch(appThunks.initializeThunk());

    return () => {
      Linking.removeEventListener('url', onAppLinkOpened);
    };
  }, []);

  return (
    <>
      <UpdateModal />
      <LinkCopiedModal isOpen={isLinkCopiedModalOpen} onClosed={onLinkCopiedModalClosed} />

      <StackNav.Navigator initialRouteName={initialRouteName} screenOptions={{ headerShown: false }}>
        {Object.entries(routeConfig).map(([name, component]: [string, any]) => (
          <StackNav.Screen key={name} name={name} component={component.screen} />
        ))}
      </StackNav.Navigator>
    </>
  );
}

export default AppNavigator;
