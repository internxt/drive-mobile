import { NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { uiActions } from 'src/store/slices/ui';
import SignInScreen from '../screens/SignInScreen';
import WebLoginScreen from '../screens/WebLoginScreen';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { driveActions } from '../store/slices/drive';
import { RootStackParamList } from '../types/navigation';
import AuthenticatedNavigator from './TabExplorerNavigator';

import { paymentsThunks } from 'src/store/slices/payments';
import { storageThunks } from 'src/store/slices/storage';
import { DeactivatedAccountScreen } from '../screens/DeactivatedAccountScreen';
import DebugScreen from '../screens/DebugScreen';
import { TrashScreen } from '../screens/common/TrashScreen';
import { DrivePreviewScreen } from '../screens/drive/DrivePreviewScreen';
import AndroidShareScreen from '../shareExtension/AndroidShareScreen';
import { useAndroidShareIntent } from '../shareExtension/useAndroidShareIntent';

const Stack = createNativeStackNavigator<RootStackParamList>();

type Props = {
  navigationContainerRef?: NavigationContainerRef<RootStackParamList>;
};

function AppNavigator({ navigationContainerRef }: Readonly<Props>): JSX.Element {
  const dispatch = useAppDispatch();
  const isLoggedIn = useAppSelector((state) => state.auth.loggedIn);

  useAndroidShareIntent(navigationContainerRef, isLoggedIn);

  const onAppLinkOpened = async (event: Linking.EventType) => {
    const sessionId = await AsyncStorage.getItem('tmpCheckoutSessionId');

    if (isLoggedIn) {
      const comesFromCheckout = !!sessionId && event.url.includes('checkout');
      if (comesFromCheckout) {
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
    const subscription = Linking.addEventListener('url', onAppLinkOpened);
    return () => subscription.remove();
  }, []);

  // Block rendering until auth state is known
  if (isLoggedIn == null) return <View />;

  const initialRouteName: keyof RootStackParamList = isLoggedIn ? 'TabExplorer' : 'SignIn';

  return (
    <Stack.Navigator initialRouteName={initialRouteName} screenOptions={{ headerShown: false, gestureEnabled: true }}>
      <Stack.Screen name="Debug" component={DebugScreen} />
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="WebLogin" component={WebLoginScreen} />
      <Stack.Screen name="DeactivatedAccount" component={DeactivatedAccountScreen} />
      <Stack.Screen name="TabExplorer" component={AuthenticatedNavigator} />
      <Stack.Screen name="Trash" component={TrashScreen} />
      <Stack.Screen
        name="DrivePreview"
        component={DrivePreviewScreen}
        options={{ animation: 'slide_from_bottom', gestureEnabled: false }}
      />
      {Platform.OS === 'android' && (
        <Stack.Screen
          name="AndroidShare"
          component={AndroidShareScreen}
          options={{ animation: 'slide_from_bottom', gestureEnabled: false }}
        />
      )}
    </Stack.Navigator>
  );
}

export default AppNavigator;
