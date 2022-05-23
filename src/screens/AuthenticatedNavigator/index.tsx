import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs/lib/typescript/src/types';

import { tailwind } from '../../helpers/designSystem';
import DriveScreen from '../DriveScreen';
import MenuScreen from '../MenuScreen';
import BottomTabNavigator from '../../components/BottomTabNavigator';
import EmptyScreen from '../EmptyScreen';
import DriveItemInfoModal from '../../components/modals/DriveItemInfoModal';
import AddModal from '../../components/modals/AddModal';
import DriveRenameModal from '../../components/modals/DriveRenameModal';
import ShareFilesModal from '../../components/modals/ShareFilesModal';
import DeleteItemModal from '../../components/modals/DeleteItemModal';
import MoveItemModal from '../../components/modals/MoveItemModal';
import RunOutOfStorageModal from '../../components/modals/RunOutOfStorageModal';
import HomeScreen from '../HomeScreen';
import { AppScreenKey as AppScreenKey } from '../../types';
import PhotosNavigator from '../PhotosNavigator';
import ReferralsBanner from '../../components/ReferralsBanner';
import { useAppDispatch } from '../../store/hooks';
import { uiActions } from '../../store/slices/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DriveDownloadModal from '../../components/modals/DriveDownloadModal';
import SignOutModal from '../../components/modals/SignOutModal';

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
    props.route.params?.showReferralsBanner && dispatch(uiActions.setIsReferralsBannerOpen(true));
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
        <Tab.Screen name="add" component={EmptyScreen} />
        <Tab.Screen name="photos" component={PhotosNavigator} />
        <Tab.Screen name={AppScreenKey.Menu} component={MenuScreen} />
      </Tab.Navigator>

      <AddModal />
      <DriveItemInfoModal />
      <DeleteItemModal />
      <MoveItemModal />
      <ShareFilesModal />
      <DriveDownloadModal />
      <DriveRenameModal />
      <RunOutOfStorageModal />
      <SignOutModal />
      <ReferralsBanner />
    </View>
  );
}
