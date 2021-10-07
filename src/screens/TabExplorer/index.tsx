import React from 'react';
import { Reducers } from '../../redux/reducers/reducers';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import FileExplorer from '../FileExplorer';
import Recents from '../Recents';
import Share from '../Share';
import Configuration from '../Configuration';
import MyTabBar from './myTabBar';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs/lib/typescript/src/types'
import VoidScreen from '../VoidScreen';
import SettingsModal from '../../modals/SettingsModal';
import { View } from 'react-native';
import FileDetailsModal from '../../modals/FileDetailsModal';
import UploadModal from '../../modals/UploadModal';
import RenameModal from '../../modals/RenameModal';
import CreateFolderModal from '../../modals/CreateFolderModal';
import ShareFilesModal from '../../modals/ShareFilesModal';
import DeleteItemModal from '../../modals/DeleteItemModal';
import FreeForYouModal from '../../modals/FreeForYouModal';
import SortModal from '../../modals/SortModal';
import MoveFilesModal from '../../modals/MoveFilesModal';
import { tailwind } from '../../helpers/designSystem';
import RunOutOfStorageModal from '../../modals/RunOutOfStorageModal';

const Tab = createBottomTabNavigator();

export default function TabExplorer(props: Reducers): JSX.Element {
  return <View style={tailwind('h-full')}>
    <FileDetailsModal {...props} />
    <SettingsModal {...props} navigation={props.navigation} />
    <UploadModal {...props} navigation={props.navigation} />
    <SortModal />
    <DeleteItemModal {...props} />
    <MoveFilesModal {...props} />
    <ShareFilesModal {...props} />
    <FreeForYouModal {...props} navigation={props.navigation} />
    <CreateFolderModal {...props} />
    <RenameModal {...props} />
    <RunOutOfStorageModal {...props} />

    <Tab.Navigator
      tabBar={(tabBarProps: BottomTabBarProps) => <MyTabBar {...{ ...props, ...tabBarProps }} />}
      initialRouteName={'FileExplorer'}
      sceneContainerStyle={tailwind('')}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true
      }}
    >
      <Tab.Screen name="Drive" component={FileExplorer} />
      <Tab.Screen name="Recents" component={Recents} />
      <Tab.Screen name="Create" component={VoidScreen} />
      <Tab.Screen name="Shared" component={Share} />
      <Tab.Screen name="Settings" component={Configuration} />
    </ Tab.Navigator>
  </View>
}