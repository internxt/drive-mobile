import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs/lib/typescript/src/types';

import { tailwind } from '../../helpers/designSystem';
import DriveScreen from '../DriveScreen';
import GalleryScreen from '../GalleryScreen';
import Configuration from '../MenuScreen';
import BottomTabNavigator from '../../components/BottomTabNavigator';
import VoidScreen from '../VoidScreen';
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
import HomeScreen from '../HomeScreen';
import { AppScreen } from '../../types';

const Tab = createBottomTabNavigator();

export default function TabExplorerScreen(): JSX.Element {
  return (
    <View style={tailwind('h-full')}>
      <FileDetailsModal />
      <SettingsModal />
      <UploadModal />
      <SortModal />
      <DeleteItemModal />
      <MoveFilesModal />
      <ShareFilesModal />
      <CreateFolderModal />
      <RenameModal />
      <RunOutOfStorageModal />

      <Tab.Navigator
        tabBar={(tabBarProps: BottomTabBarProps) => <BottomTabNavigator {...{ ...tabBarProps }} />}
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
        <Tab.Screen name={AppScreen.Photos} component={GalleryScreen} />
        <Tab.Screen name={AppScreen.Menu} component={Configuration} />
      </Tab.Navigator>
    </View>
  );
}
