import React from 'react';
import { Reducers } from '../../store/reducers/reducers';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs/lib/typescript/src/types';

import { tailwind } from '../../helpers/designSystem';
import DriveScreen from '../../screens/DriveScreen';
import PhotosScreen from '../../screens/PhotosScreen';
import Configuration from '../../screens/MenuScreen';
import BottomTabNavigator from '../../components/BottomTabNavigator';
import VoidScreen from '../../screens/VoidScreen';
import SettingsModal from '../../components/modals/SettingsModal';
import FileDetailsModal from '../../components/modals/FileDetailsModal';
import UploadModal from '../../components/modals/UploadModal';
import RenameModal from '../../components/modals/RenameModal';
import CreateFolderModal from '../../components/modals/CreateFolderModal';
import ShareFilesModal from '../../components/modals/ShareFilesModal';
import DeleteItemModal from '../../components/modals/DeleteItemModal';
import SortModal from '../../components/modals/SortModal';
import MoveFilesModal from '../../components/modals/MoveFilesModal';
import RunOutOfStorageModal from '../../components/modals/RunOutOfStorageModal';
import HomeScreen from '../../screens/HomeScreen';
import { AppScreen } from '../../types';

const Tab = createBottomTabNavigator();

export default function TabExplorer(props: Reducers): JSX.Element {
  return (
    <View style={tailwind('h-full')}>
      <FileDetailsModal {...props} />
      <SettingsModal {...props} navigation={props.navigation} />
      <UploadModal {...props} navigation={props.navigation} />
      <SortModal />
      <DeleteItemModal {...props} />
      <MoveFilesModal {...props} />
      <ShareFilesModal {...props} />
      <CreateFolderModal {...props} />
      <RenameModal {...props} />
      <RunOutOfStorageModal {...props} />

      <Tab.Navigator
        tabBar={(tabBarProps: BottomTabBarProps) => <BottomTabNavigator {...{ ...props, ...tabBarProps }} />}
        initialRouteName={AppScreen.Home}
        sceneContainerStyle={tailwind('')}
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: true,
        }}
      >
        <Tab.Screen name={AppScreen.Home} component={HomeScreen} />
        <Tab.Screen name={AppScreen.Drive} component={DriveScreen} />
        <Tab.Screen name="create" component={VoidScreen} />
        <Tab.Screen name={AppScreen.Photos} component={PhotosScreen} />
        <Tab.Screen name={AppScreen.Menu} component={Configuration} />
      </Tab.Navigator>
    </View>
  );
}
