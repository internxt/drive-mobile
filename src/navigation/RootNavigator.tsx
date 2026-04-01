import { NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform, View } from 'react-native';
import { LargeShareUploadScreen } from '../screens/LargeShareUpload/LargeShareUploadScreen';

import SignInScreen from '../screens/SignInScreen';
import WebLoginScreen from '../screens/WebLoginScreen';
import { useAppSelector } from '../store/hooks';
import { RootStackParamList } from '../types/navigation';
import AuthenticatedNavigator from './TabExplorerNavigator';

import { useDeepLinks } from '../hooks/useDeepLinks';
import { DeactivatedAccountScreen } from '../screens/DeactivatedAccountScreen';
import DebugScreen from '../screens/DebugScreen';
import { TrashScreen } from '../screens/common/TrashScreen';
import { DrivePreviewScreen } from '../screens/drive/DrivePreviewScreen';
import ShareExtensionView from '../shareExtension/ShareExtensionView.android';
import { useIosPendingShareHandoff } from '../shareExtension/hooks/useIosPendingShareHandoff';
import { useAndroidShareIntent } from '../shareExtension/useAndroidShareIntent';

const Stack = createNativeStackNavigator<RootStackParamList>();

type Props = {
  navigationContainerRef?: NavigationContainerRef<RootStackParamList>;
};

function AppNavigator({ navigationContainerRef }: Readonly<Props>): JSX.Element {
  const isLoggedIn = useAppSelector((state) => state.auth.loggedIn);

  useAndroidShareIntent(navigationContainerRef, isLoggedIn);
  useIosPendingShareHandoff(navigationContainerRef, isLoggedIn);
  useDeepLinks(navigationContainerRef, isLoggedIn);

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
          component={ShareExtensionView}
          options={{ animation: 'slide_from_bottom', gestureEnabled: false }}
        />
      )}
      {Platform.OS === 'ios' && (
        <Stack.Screen
          name="LargeShareUpload"
          component={LargeShareUploadScreen}
          options={{ animation: 'slide_from_bottom', gestureEnabled: false }}
        />
      )}
    </Stack.Navigator>
  );
}

export default AppNavigator;
