import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform } from 'react-native';

import SignInScreen from '../screens/SignInScreen';
import WebLoginScreen from '../screens/WebLoginScreen';
import DebugScreen from '../screens/DebugScreen';
import ShareExtensionView from '../shareExtension/ShareExtensionView.android';
import { RootStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AuthStackNavigator(): JSX.Element {
  return (
    <Stack.Navigator initialRouteName="SignIn" screenOptions={{ headerShown: false, gestureEnabled: true }}>
      <Stack.Screen name="Debug" component={DebugScreen} />
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="WebLogin" component={WebLoginScreen} />
      {Platform.OS === 'android' && (
        <Stack.Screen
          name="AndroidShare"
          component={ShareExtensionView}
          options={{ animation: 'slide_from_bottom', gestureEnabled: false }}
        />
      )}
    </Stack.Navigator>
  );
}
