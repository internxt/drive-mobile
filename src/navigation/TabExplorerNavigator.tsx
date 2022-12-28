import React, { useEffect } from 'react';
import { AppState, AppStateStatus, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs/lib/typescript/src/types';

import BottomTabNavigator from '../components/BottomTabNavigator';
import EmptyScreen from '../screens/EmptyScreen';
import DriveItemInfoModal from '../components/modals/DriveItemInfoModal';
import { SharedLinkInfoModal } from '../components/modals/SharedLinkInfoModal';

import AddModal from '../components/modals/AddModal';
import DriveRenameModal from '../components/modals/DriveRenameModal';
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
import SecurityModal from 'src/components/modals/SecurityModal';
import { SettingsNavigator } from './SettingsNavigator';
import { referralsThunks } from 'src/store/slices/referrals';
import { storageThunks } from 'src/store/slices/storage';
import asyncStorageService from '@internxt-mobile/services/AsyncStorageService';
import { AsyncStorageKey } from '../types';
import { authThunks } from 'src/store/slices/auth';
import appService from '@internxt-mobile/services/AppService';
import { DriveNavigator } from './DriveNavigator';

const Tab = createBottomTabNavigator<TabExplorerStackParamList>();

// On dev mode, sets the initial route for this navigator so you don't need to navigate on every reload
const LAUNCH_ON_ROUTE_ON_DEV_MODE: keyof TabExplorerStackParamList | undefined = appService.isDevMode
  ? undefined
  : undefined;
export default function TabExplorerNavigator(props: RootStackScreenProps<'TabExplorer'>): JSX.Element {
  const tailwind = useTailwind();
  const dispatch = useAppDispatch();
  const safeAreaInsets = useSafeAreaInsets();
  const { isSecurityModalOpen } = useAppSelector((state) => state.ui);
  const onSecurityModalClosed = () => dispatch(uiActions.setIsSecurityModalOpen(false));

  useEffect(() => {
    props.route.params?.showReferralsBanner && dispatch(uiActions.setIsReferralsBannerOpen(true));

    const subscription = AppState.addEventListener('change', handleOnAppStateChange);
    return () => subscription.remove();
  }, []);

  async function handleOnAppStateChange(state: AppStateStatus) {
    if (state === 'active') {
      try {
        await dispatch(referralsThunks.fetchReferralsThunk()).unwrap();
        await dispatch(storageThunks.loadLimitThunk()).unwrap();
      } catch {
        const isDeletingAccount = await asyncStorageService.getItem(AsyncStorageKey.IsDeletingAccount);
        if (isDeletingAccount) {
          dispatch(authThunks.signOutThunk());
          props.navigation.replace('DeactivatedAccount');
        }
      }
    }
  }
  return (
    <View style={{ ...tailwind('h-full'), paddingBottom: safeAreaInsets.bottom }}>
      <Tab.Navigator
        tabBar={(tabBarProps: BottomTabBarProps) => <BottomTabNavigator {...{ ...tabBarProps }} />}
        initialRouteName={LAUNCH_ON_ROUTE_ON_DEV_MODE || 'Home'}
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: true,
          lazy: true,
        }}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Drive" component={DriveNavigator} options={{ lazy: false }} />
        <Tab.Screen name="Add" component={EmptyScreen} />
        <Tab.Screen name="Photos" component={PhotosNavigator} options={{ lazy: false }} />
        <Tab.Screen name="Settings" component={SettingsNavigator} options={{ lazy: false }} />
      </Tab.Navigator>

      <ReferralsBanner />
      <AddModal />
      <DriveItemInfoModal />
      <SharedLinkInfoModal />
      <MoveItemsModal />
      <DriveDownloadModal />
      <DriveRenameModal />
      <RunOutOfStorageModal />
      <SignOutModal />
      <SecurityModal isOpen={isSecurityModalOpen} onClose={onSecurityModalClosed} />
    </View>
  );
}
