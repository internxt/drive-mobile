import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs/lib/typescript/src/types';

import { tailwind } from '../../helpers/designSystem';
import DriveScreen from '../DriveScreen';
import MenuScreen from '../MenuScreen';
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
import { AppScreenKey as AppScreenKey } from '../../types';
import PhotosNavigator from '../PhotosNavigator';
import ReferralsBanner from '../../components/ReferralsBanner';
import { useAppDispatch } from '../../store/hooks';
import { layoutActions } from '../../store/slices/layout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator();

interface AuthenticatedNavigatorProps {
  route: {
    params?: {
      showReferralsBanner?: boolean;
    };
  };
}

export default function AuthenticatedNavigator(props: AuthenticatedNavigatorProps): JSX.Element {
  const dispatch = useAppDispatch();
  const safeAreaInsets = useSafeAreaInsets();

  useEffect(() => {
    props.route.params?.showReferralsBanner && dispatch(layoutActions.setIsReferralsBannerOpen(true));
  }, []);

  return (
    <View style={{ ...tailwind('h-full'), paddingBottom: safeAreaInsets.bottom }}>
      <Tab.Navigator
        tabBar={(tabBarProps: BottomTabBarProps) => <BottomTabNavigator {...{ ...tabBarProps }} />}
        initialRouteName={AppScreenKey.Home}
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: true,
          lazy: true,
        }}
      >
        <Tab.Screen name={AppScreenKey.Home} component={HomeScreen} />
        <Tab.Screen name={AppScreenKey.Drive} component={DriveScreen} />
        <Tab.Screen name="create" component={VoidScreen} />
        <Tab.Screen name="photos" component={PhotosNavigator} />
        <Tab.Screen name={AppScreenKey.Menu} component={MenuScreen} />
      </Tab.Navigator>

      <FileDetailsModal />
      <SettingsModal />
      <UploadModal />
      <DeleteItemModal />
      <MoveFilesModal />
      <ShareFilesModal />
      <CreateFolderModal />
      <RenameModal />
      <RunOutOfStorageModal />

      <ReferralsBanner />
    </View>
  );
}
