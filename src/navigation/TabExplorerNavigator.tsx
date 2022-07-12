import React, { useEffect } from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs/lib/typescript/src/types';

import DriveScreen from '../screens/DriveScreen';
import SettingsScreen from '../screens/SettingsScreen';
import BottomTabNavigator from '../components/BottomTabNavigator';
import EmptyScreen from '../screens/EmptyScreen';
import DriveItemInfoModal from '../components/modals/DriveItemInfoModal';
import AddModal from '../components/modals/AddModal';
import DriveRenameModal from '../components/modals/DriveRenameModal';
import ShareFilesModal from '../components/modals/ShareFilesModal';
import DeleteItemModal from '../components/modals/DeleteItemModal';
import MoveItemsModal from '../components/modals/MoveItemsModal';
import RunOutOfStorageModal from '../components/modals/RunOutOfStorageModal';
import HomeScreen from '../screens/HomeScreen';
import PhotosNavigator from './PhotosNavigator';
import ReferralsBanner from '../components/ReferralsBanner';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { uiActions } from '../store/slices/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DriveDownloadModal from '../components/modals/DriveDownloadModal';
import SignOutModal from '../components/modals/SignOutModal';
import { RootStackScreenProps, TabExplorerStackParamList } from '../types/navigation';
import { useTailwind } from 'tailwind-rn';
import AccountScreen from '../screens/AccountScreen';
import SecurityScreen from '../screens/SecurityScreen';
import StorageScreen from '../screens/StorageScreen';
import PlanScreen from '../screens/PlanScreen';
import SecurityModal from 'src/components/modals/SecurityModal';

const Tab = createBottomTabNavigator<TabExplorerStackParamList>();

export default function TabExplorerNavigator(props: RootStackScreenProps<'TabExplorer'>): JSX.Element {
  const tailwind = useTailwind();
  const dispatch = useAppDispatch();
  const safeAreaInsets = useSafeAreaInsets();
  const { isSecurityModalOpen } = useAppSelector((state) => state.ui);
  const onSecurityModalClosed = () => dispatch(uiActions.setIsSecurityModalOpen(false));

  useEffect(() => {
    props.route.params?.showReferralsBanner && dispatch(uiActions.setIsReferralsBannerOpen(true));
  }, []);

  return (
    <View style={{ ...tailwind('h-full'), paddingBottom: safeAreaInsets.bottom }}>
      <Tab.Navigator
        tabBar={(tabBarProps: BottomTabBarProps) => <BottomTabNavigator {...{ ...tabBarProps }} />}
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: true,
          lazy: true,
        }}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Drive" component={DriveScreen} />
        <Tab.Screen name="Add" component={EmptyScreen} />
        <Tab.Screen name="Photos" component={PhotosNavigator} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
        <Tab.Screen name="Account" component={AccountScreen} />
        <Tab.Screen name="Security" component={SecurityScreen} />
        <Tab.Screen name="Storage" component={StorageScreen} />
        <Tab.Screen name="Plan" component={PlanScreen} />
      </Tab.Navigator>

      <ReferralsBanner />
      <AddModal />
      <DriveItemInfoModal />
      <DeleteItemModal />
      <MoveItemsModal />
      <ShareFilesModal />
      <DriveDownloadModal />
      <DriveRenameModal />
      <RunOutOfStorageModal />
      <SignOutModal />
      <SecurityModal isOpen={isSecurityModalOpen} onClose={onSecurityModalClosed} />
    </View>
  );
}
