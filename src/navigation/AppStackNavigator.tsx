import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform } from 'react-native';

import { LargeShareUploadScreen } from '../screens/LargeShareUpload/LargeShareUploadScreen';
import { DeactivatedAccountScreen } from '../screens/DeactivatedAccountScreen';
import DebugScreen from '../screens/DebugScreen';
import { TrashScreen } from '../screens/common/TrashScreen';
import { DrivePreviewScreen } from '../screens/drive/DrivePreviewScreen';
import { PhotoPreviewScreen } from '../screens/PhotoPreviewScreen';
import { SettingsNavigator } from './SettingsNavigator';
import AuthenticatedNavigator from './TabExplorerNavigator';
import ShareExtensionView from '../shareExtension/ShareExtensionView.android';
import { RootStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppStackNavigator(): JSX.Element {
  return (
    <Stack.Navigator initialRouteName="TabExplorer" screenOptions={{ headerShown: false, gestureEnabled: true }}>
      <Stack.Screen name="Debug" component={DebugScreen} />
      <Stack.Screen name="DeactivatedAccount" component={DeactivatedAccountScreen} />
      <Stack.Screen name="TabExplorer" component={AuthenticatedNavigator} />
      <Stack.Screen name="Trash" component={TrashScreen} />
      <Stack.Screen name="Settings" component={SettingsNavigator} />
      <Stack.Screen
        name="DrivePreview"
        component={DrivePreviewScreen}
        options={{ animation: 'slide_from_bottom', gestureEnabled: false }}
      />
      <Stack.Screen
        name="PhotoPreview"
        component={PhotoPreviewScreen}
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
