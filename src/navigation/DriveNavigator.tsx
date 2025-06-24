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
          folderUuid: user?.rootFolderId,
        }}
        options={{ animation: 'default' }}
      />
    </DriveStack.Navigator>
  );
};
