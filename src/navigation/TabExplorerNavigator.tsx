import appService from '@internxt-mobile/services/AppService';
import asyncStorageService from '@internxt-mobile/services/AsyncStorageService';
import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigationState } from '@react-navigation/native';
import { useEffect } from 'react';
import { AppState, AppStateStatus, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { loadUnreadCountsThunk } from 'src/store/slices/mail';
import { paymentsSelectors } from 'src/store/slices/payments';
import { runBackupCycleThunk } from 'src/store/slices/photos';
import { storageThunks } from 'src/store/slices/storage';
import { uiActions } from 'src/store/slices/ui';
import { useTailwind } from 'tailwind-rn';
import BottomTabNavigator from '../components/BottomTabNavigator';
import FloatingActionButton from '../components/FloatingActionButton';
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
import HomeScreen from '../screens/HomeScreen';
import { useDiscoverPhotosSheet } from '../screens/HomeScreen/useDiscoverPhotosSheet';
import PhotosScreen from '../screens/PhotosScreen';
import DiscoverPhotosBottomSheet from '../screens/PhotosScreen/DiscoverPhotosBottomSheet';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { AsyncStorageKey } from '../types';
import { RootStackScreenProps, TabExplorerStackParamList } from '../types/navigation';
import { DriveNavigator } from './DriveNavigator';
import { getFloatingButtonMode } from './floatingButtonMode';
import { MailNavigator } from './MailNavigator';
import { SettingsNavigator } from './SettingsNavigator';

const Tab = createBottomTabNavigator<TabExplorerStackParamList>();

// On dev mode, sets the initial route for this navigator so you don't need to navigate on every reload
const LAUNCH_ON_ROUTE_ON_DEV_MODE: keyof TabExplorerStackParamList | undefined = appService.isDevMode
  ? undefined
  : undefined;

const TabFloatingButton = ({ onCompose }: { onCompose: () => void }): JSX.Element | null => {
  const dispatch = useAppDispatch();
  const tabExplorerState = useNavigationState(
    (state) => state.routes.find((route) => route.name === 'TabExplorer')?.state,
  );
  const hasMailAccess = useAppSelector(paymentsSelectors.hasMailAccess);
  const isUploadMenuOpen = useAppSelector((state) => state.ui.showUploadModal);
  const isTabBarHidden = useAppSelector((state) => state.ui.isTabBarHidden);
  const isFloatingButtonHidden = useAppSelector((state) => state.ui.isFloatingButtonHidden);
  const isComposeButtonCollapsed = useAppSelector((state) => state.ui.isComposeButtonCollapsed);

  const mode = getFloatingButtonMode(tabExplorerState);
  const isComposeUnavailable = mode === 'compose' && (!hasMailAccess || isFloatingButtonHidden);
  if (!mode || isTabBarHidden || isComposeUnavailable) {
    return null;
  }

  const onPress = () => {
    if (mode === 'compose') {
      onCompose();
      return;
    }
    dispatch(uiActions.setShowUploadFileModal(!isUploadMenuOpen));
  };

  return (
    <FloatingActionButton
      mode={mode}
      isLabelShown={!isComposeButtonCollapsed}
      isMenuOpen={isUploadMenuOpen}
      onPress={onPress}
    />
  );
};

export default function TabExplorerNavigator(props: RootStackScreenProps<'TabExplorer'>): JSX.Element {
  const tailwind = useTailwind();
  const dispatch = useAppDispatch();
  const getColor = useGetColor();
  const safeAreaInsets = useSafeAreaInsets();
  const hasMailAccess = useAppSelector(paymentsSelectors.hasMailAccess);
  const discoverSheet = useDiscoverPhotosSheet(
    appService.isPhotosEnabled ? () => props.navigation.navigate('TabExplorer', { screen: 'Photos' }) : () => undefined,
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleOnAppStateChange);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!hasMailAccess) {
      return;
    }
    dispatch(loadUnreadCountsThunk());
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        dispatch(loadUnreadCountsThunk());
      }
    });
    return () => subscription.remove();
  }, [hasMailAccess, dispatch]);

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
          animation: 'fade',
        }}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Drive" component={DriveNavigator} options={{ lazy: false }} />
        <Tab.Screen name="Shared" component={SharedScreen} options={{ lazy: false }} />
        <Tab.Screen name="Mail" component={MailNavigator} />
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
      <AddModal floatingButton={<TabFloatingButton onCompose={() => props.navigation.navigate('ComposeEmail')} />} />
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
