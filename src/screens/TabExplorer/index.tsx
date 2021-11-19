import React from 'react';
import { Reducers } from '../../store/reducers/reducers';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import FileExplorer from '../FileExplorer';
import Recents from '../Recents';
import Photos from '../Photos/Photos'
import Share from '../Share';
import Configuration from '../Configuration';
import MyTabBar from './myTabBar';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs/lib/typescript/src/types'
import VoidScreen from '../VoidScreen';
import SettingsModal from '../../components/modals/SettingsModal';
import { View } from 'react-native';
import FileDetailsModal from '../../components/modals/FileDetailsModal';
import UploadModal from '../../components/modals/UploadModal';
import RenameModal from '../../components/modals/RenameModal';
import CreateFolderModal from '../../components/modals/CreateFolderModal';
import ShareFilesModal from '../../components/modals/ShareFilesModal';
import DeleteItemModal from '../../components/modals/DeleteItemModal';
import SortModal from '../../components/modals/SortModal';
import MoveFilesModal from '../../components/modals/MoveFilesModal';
import { tailwind } from '../../helpers/designSystem';
import RunOutOfStorageModal from '../../components/modals/RunOutOfStorageModal';

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
      {process.env.NODE_ENV === 'production'
        ?
        <Tab.Screen name="Recents" component={Recents} />
        :
        <Tab.Screen name="Photos" component={Photos} />
      }
      <Tab.Screen name="Create" component={VoidScreen} />
      <Tab.Screen name="Shared" component={Share} />
      <Tab.Screen name="Settings" component={Configuration} />
    </Tab.Navigator>
  </View>
}