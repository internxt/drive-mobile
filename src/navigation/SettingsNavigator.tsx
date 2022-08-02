import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AccountScreen from 'src/screens/AccountScreen';
import PlanScreen from 'src/screens/PlanScreen';
import SecurityScreen from 'src/screens/SecurityScreen';
import SettingsScreen from 'src/screens/SettingsScreen';
import StorageScreen from 'src/screens/StorageScreen';

const SettingsStack = createNativeStackNavigator();
export const SettingsNavigator = () => {
  return (
    <SettingsStack.Navigator screenOptions={{ headerShown: false }}>
      <SettingsStack.Screen name="SettingsHome" component={SettingsScreen} />
      <SettingsStack.Screen name="Account" component={AccountScreen} />
      <SettingsStack.Screen name="Security" component={SecurityScreen} />
      <SettingsStack.Screen name="Storage" component={StorageScreen} />
      <SettingsStack.Screen name="Plan" component={PlanScreen} />
    </SettingsStack.Navigator>
  );
};
