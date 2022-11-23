import { DriveStackParamList } from '@internxt-mobile/types/navigation';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DriveFolderScreen } from 'src/screens/drive/DriveFolderScreen';
import { useAppSelector } from 'src/store/hooks';

const DriveStack = createNativeStackNavigator<DriveStackParamList>();

export const DriveNavigator = () => {
  const { user } = useAppSelector((state) => state.auth);
  return (
    <DriveStack.Navigator screenOptions={{ headerShown: false }}>
      <DriveStack.Screen
        name="DriveFolder"
        component={DriveFolderScreen}
        initialParams={{
          isRootFolder: true,
          folderId: user?.root_folder_id,
        }}
        options={{ animation: 'default' }}
      />
    </DriveStack.Navigator>
  );
};
