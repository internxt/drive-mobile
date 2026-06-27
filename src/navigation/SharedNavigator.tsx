import { SharedStackParamList } from '@internxt-mobile/types/navigation';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SharedFolderScreen } from 'src/screens/drive/SharedFolderScreen';
import { SharedScreen } from 'src/screens/drive/SharedScreen/SharedScreen';

const SharedStack = createNativeStackNavigator<SharedStackParamList>();

export const SharedNavigator = () => {
  return (
    <SharedStack.Navigator screenOptions={{ headerShown: false }}>
      <SharedStack.Screen name="SharedRoot" component={SharedScreen} />
      <SharedStack.Screen name="SharedFolder" component={SharedFolderScreen} options={{ animation: 'default' }} />
    </SharedStack.Navigator>
  );
};
