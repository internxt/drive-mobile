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

const Tab = createBottomTabNavigator();

export default function TabExplorer(props: Reducers): JSX.Element {
  return <View style={{ flex: 1 }}>
    <FileDetailsModal />
    <SettingsModal navigation={props.navigation} />
    <UploadModal navigation={props.navigation} />
    <SortModal />
    <DeleteItemModal />
    <MoveFilesModal />
    <ShareFilesModal />
    <FreeForYouModal navigation={props.navigation} />
    <CreateFolderModal />
    <RenameModal />

    <Tab.Navigator
      tabBar={(tabBarProps: BottomTabBarProps) => <MyTabBar {...{ ...props, ...tabBarProps }} />}
      initialRouteName={'FileExplorer'}
      screenOptions={({ route }) => ({
        headerShown: false
      })}
    >
      <Tab.Screen name="Drive" component={FileExplorer} />
      <Tab.Screen name="Recents" component={Recents} />
      <Tab.Screen name="Upload" component={VoidScreen} />
      <Tab.Screen name="Share" component={Share} />
      <Tab.Screen name="Settings" component={Configuration} />
    </ Tab.Navigator>
  </View>
}