import appService from '@internxt-mobile/services/AppService';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AccountScreen from 'src/screens/AccountScreen';
import { TrashScreen } from 'src/screens/common/TrashScreen';
import PlanScreen from 'src/screens/PlanScreen';
import SecurityScreen from 'src/screens/SecurityScreen';
import SettingsScreen from 'src/screens/SettingsScreen';
import StorageScreen from 'src/screens/StorageScreen';

// On dev mode, sets the initial route for this navigator so you don't need to navigate on every reload
const LAUNCH_ON_ROUTE_ON_DEV_MODE: string | undefined = appService.isDevMode ? undefined : undefined;
const SettingsStack = createNativeStackNavigator();
export const SettingsNavigator = () => {
  return (
    <SettingsStack.Navigator
      initialRouteName={LAUNCH_ON_ROUTE_ON_DEV_MODE || 'SettingsHome'}
      screenOptions={{ headerShown: false }}
    >
      <SettingsStack.Screen name="SettingsHome" component={SettingsScreen} />
      <SettingsStack.Screen name="Account" component={AccountScreen} />
      <SettingsStack.Screen name="Security" component={SecurityScreen} />
      <SettingsStack.Screen name="Storage" component={StorageScreen} />
      <SettingsStack.Screen name="Plan" component={PlanScreen} />
      <SettingsStack.Screen name="Trash" component={TrashScreen} />
    </SettingsStack.Navigator>
  );
};
