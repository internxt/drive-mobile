import appService from '@internxt-mobile/services/AppService';
import asyncStorageService from '@internxt-mobile/services/AsyncStorageService';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs/lib/typescript/src/types';
import { useEffect } from 'react';
import { AppState, AppStateStatus, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { runBackupCycleThunk } from 'src/store/slices/photos';
import { storageThunks } from 'src/store/slices/storage';
import { useTailwind } from 'tailwind-rn';
import BottomTabNavigator from '../components/BottomTabNavigator';
import AddModal from '../components/modals/AddModal';
import DriveItemInfoModal from '../components/modals/DriveItemInfoModal';
import DriveRenameModal from '../components/modals/DriveRenameModal';
import EmptyFileNotAllowedModal from '../components/modals/EmptyFileNotAllowedModal';
import FileSizeExceededModal from '../components/modals/FileSizeExceededModal';
import MoveItemsModal from '../components/modals/MoveItemsModal';
import NotEnoughDeviceSpaceModal from '../components/modals/NotEnoughDeviceSpaceModal';
import RunOutOfStorageModal from '../components/modals/RunOutOfStorageModal';
import { SharedLinkInfoModal } from '../components/modals/SharedLinkInfoModal';
import useGetColor from '../hooks/useColor';
import { SharedScreen } from '../screens/drive/SharedScreen/SharedScreen';
import EmptyScreen from '../screens/EmptyScreen';
import HomeScreen from '../screens/HomeScreen';
import MailboxListScreen from '../screens/mail/MailboxListScreen';
import { useDiscoverPhotosSheet } from '../screens/HomeScreen/useDiscoverPhotosSheet';
import PhotosScreen from '../screens/PhotosScreen';
import DiscoverPhotosBottomSheet from '../screens/PhotosScreen/DiscoverPhotosBottomSheet';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { uiActions } from '../store/slices/ui';
import { AsyncStorageKey } from '../types';
import { RootStackScreenProps, TabExplorerScreenProps, TabExplorerStackParamList } from '../types/navigation';
import { DriveNavigator } from './DriveNavigator';
import { MailNavigator } from './MailNavigator';
import { SettingsNavigator } from './SettingsNavigator';

const Tab = createBottomTabNavigator<TabExplorerStackParamList>();

// On dev mode, sets the initial route for this navigator so you don't need to navigate on every reload
const LAUNCH_ON_ROUTE_ON_DEV_MODE: keyof TabExplorerStackParamList | undefined = appService.isDevMode
  ? undefined
  : undefined;

// The Home tab shows Recents in Drive space, or the Inbox in Mail space
function TabHomeScreen(props: TabExplorerScreenProps<'Home'>): JSX.Element {
  const activeSpace = useAppSelector((state) => state.ui.activeSpace);
  return activeSpace === 'mail' ? <MailboxListScreen /> : <HomeScreen {...props} />;
}

// The Drive tab shows the Drive file browser or the Mail folder browser, depending on the active space
function TabDriveOrMailScreen(): JSX.Element {
  const activeSpace = useAppSelector((state) => state.ui.activeSpace);
  return activeSpace === 'mail' ? <MailNavigator /> : <DriveNavigator />;
}

export default function TabExplorerNavigator(props: RootStackScreenProps<'TabExplorer'>): JSX.Element {
  const tailwind = useTailwind();
  const dispatch = useAppDispatch();
  const getColor = useGetColor();
  const safeAreaInsets = useSafeAreaInsets();
  const discoverSheet = useDiscoverPhotosSheet(
    appService.isPhotosEnabled ? () => props.navigation.navigate('TabExplorer', { screen: 'Photos' }) : () => undefined,
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleOnAppStateChange);
    return () => subscription.remove();
  }, []);

  async function handleOnAppStateChange(state: AppStateStatus) {
    if (state === 'active') {
      if (appService.isPhotosEnabled) dispatch(runBackupCycleThunk());
      try {
        await dispatch(storageThunks.loadLimitThunk()).unwrap();
      } catch {
        const isDeletingAccount = await asyncStorageService.getItem(AsyncStorageKey.IsDeletingAccount);
        if (isDeletingAccount) {
          props.navigation.replace('DeactivatedAccount');
        }
      }
    }
  }

  return (
    <View
      style={{ ...tailwind('h-full'), backgroundColor: getColor('bg-surface'), paddingBottom: safeAreaInsets.bottom }}
    >
      <Tab.Navigator
        tabBar={(tabBarProps: BottomTabBarProps) => <BottomTabNavigator {...{ ...tabBarProps }} />}
        initialRouteName={LAUNCH_ON_ROUTE_ON_DEV_MODE || 'Home'}
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: true,
          lazy: true,
        }}
      >
        <Tab.Screen name="Home" component={TabHomeScreen} />
        <Tab.Screen name="Drive" component={TabDriveOrMailScreen} options={{ lazy: false }} />
        <Tab.Screen name="Add" component={EmptyScreen} />
        <Tab.Screen name="Shared" component={SharedScreen} options={{ lazy: false }} />
        {appService.isPhotosEnabled ? (
          <Tab.Screen name="Photos" component={PhotosScreen} />
        ) : (
          <Tab.Screen name="Settings" component={SettingsNavigator} />
        )}
      </Tab.Navigator>

      {appService.isPhotosEnabled && (
        <DiscoverPhotosBottomSheet
          isOpen={discoverSheet.isOpen}
          onDismiss={discoverSheet.onDismiss}
          onStartPhotos={discoverSheet.onStartPhotos}
        />
      )}
      <AddModal />
      <DriveItemInfoModal />
      <SharedLinkInfoModal />
      <MoveItemsModal />
      <DriveRenameModal />
      <RunOutOfStorageModal />
      <EmptyFileNotAllowedModal />
      <FileSizeExceededModal />
      <NotEnoughDeviceSpaceModal />
    </View>
  );
}
