import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import ReceiveSharingIntent from 'react-native-receive-sharing-intent';

import { RootStackParamList } from '../types/navigation';
import SignInScreen from '../screens/SignInScreen';
import SignUpScreen from '../screens/SignUpScreen';
import AuthenticatedNavigator from './TabExplorerNavigator';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import PhotosPreviewScreen from '../screens/PhotosPreviewScreen';
import { driveActions } from '../store/slices/drive';
import { Alert, Platform, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import analyticsService from '../services/AnalyticsService';
import DebugScreen from '../screens/DebugScreen';
import { uiActions } from 'src/store/slices/ui';
import { paymentsThunks } from 'src/store/slices/payments';
import { storageThunks } from 'src/store/slices/storage';

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator(): JSX.Element {
  const dispatch = useAppDispatch();
  const isLoggedIn = useAppSelector((state) => state.auth.loggedIn);

  const initialRouteName: keyof RootStackParamList = isLoggedIn ? 'TabExplorer' : 'SignIn';
  const onAppLinkOpened = async (event: Linking.EventType) => {
    const sessionId = await AsyncStorage.getItem('tmpCheckoutSessionId');

    if (isLoggedIn) {
      const comesFromCheckout = !!sessionId && event.url.includes('checkout');

      if (comesFromCheckout) {
        await analyticsService.trackPayment(sessionId as string);
        await AsyncStorage.removeItem('tmpCheckoutSessionId');
        /**
         * We will update the UI in 5s since we don't have
         * realtime updates, good luck
         */
        setTimeout(() => {
          dispatch(paymentsThunks.loadUserSubscriptionThunk());
          dispatch(storageThunks.loadLimitThunk());
        }, 5000);

        dispatch(uiActions.setIsPlansModalOpen(false));
      }
    }

    if (event.url) {
      const regex = /inxt:\/\//g;
      if (event.url.match(/inxt:\/\/.*:\/*/g)) {
        const finalUri = event.url.replace(regex, '');

        dispatch(driveActions.setUri(finalUri));
      }
    }
  };

  useEffect(() => {
    Linking.addEventListener('url', onAppLinkOpened);

    Linking.getInitialURL().then((uri) => {
      if (uri) {
        if (uri.match(/inxt:\/\/.*:\/*/g)) {
          const regex = /inxt:\/\//g;
          const finalUri = uri.replace(regex, '');

          dispatch(driveActions.setUri(finalUri));
        }
      }
    });

    if (Platform.OS === 'android') {
      ReceiveSharingIntent.getReceivedFiles(
        (files) => {
          const fileInfo = {
            fileUri: files[0].contentUri,
            fileName: files[0].fileName,
          };

          dispatch(driveActions.setUri(fileInfo.fileUri));
          ReceiveSharingIntent.clearReceivedFiles();
        },
        (error) => {
          Alert.alert('There was an error', error.message);
        },
        'inxt',
      );
    }

    return () => {
      Linking.removeEventListener('url', onAppLinkOpened);
    };
  }, []);

  // We send null here when we don't know the isLoggedIn status yet, so we avoid
  // redirects to the login screen even with the user logged
  if (isLoggedIn == null) return <View></View>;
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: false, animation: 'slide_from_right', gestureEnabled: false }}
    >
      <Stack.Screen name="Debug" component={DebugScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="TabExplorer" component={AuthenticatedNavigator} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="PhotosPreview" component={PhotosPreviewScreen} />
    </Stack.Navigator>
  );
}

export default AppNavigator;
