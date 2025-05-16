import * as NavigationBar from 'expo-navigation-bar';
import { useEffect, useState } from 'react';
import {
  AppStateStatus,
  ColorValue,
  KeyboardAvoidingView,
  NativeEventSubscription,
  Platform,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import Portal from '@burstware/react-native-portal';
import * as Linking from 'expo-linking';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useTailwind } from 'tailwind-rn';
import AppToast from './components/AppToast';
import ChangeProfilePictureModal from './components/modals/ChangeProfilePictureModal';
import DeleteAccountModal from './components/modals/DeleteAccountModal';
import EditNameModal from './components/modals/EditNameModal';
import LanguageModal from './components/modals/LanguageModal';
import LinkCopiedModal from './components/modals/LinkCopiedModal';
import PlansModal from './components/modals/PlansModal';
import { DriveContextProvider } from './contexts/Drive';
import { getRemoteUpdateIfAvailable, useLoadFonts } from './helpers';
import Navigation from './navigation';
import { LockScreen } from './screens/common/LockScreen';
import analyticsService from './services/AnalyticsService';
import appService from './services/AppService';
import authService from './services/AuthService';
import { logger } from './services/common';
import { time } from './services/common/time';
import errorService from './services/ErrorService';
import fileSystemService from './services/FileSystemService';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { appActions, appThunks } from './store/slices/app';
import { authThunks } from './store/slices/auth';
import { paymentsThunks } from './store/slices/payments';
import { uiActions } from './store/slices/ui';

let listener: NativeEventSubscription | null = null;

export default function App(): JSX.Element {
  const dispatch = useAppDispatch();
  const tailwind = useTailwind();
  const { isReady: fontsAreReady } = useLoadFonts();
  const { user } = useAppSelector((state) => state.auth);
  const { screenLocked, lastScreenLock, initialScreenLocked } = useAppSelector((state) => state.app);

  const { color: whiteColor } = tailwind('text-white');
  const [isAppInitialized, setIsAppInitialized] = useState(false);
  const {
    isLinkCopiedModalOpen,
    isDeleteAccountModalOpen,
    isEditNameModalOpen,
    isChangeProfilePictureModalOpen,
    isLanguageModalOpen,
    isPlansModalOpen,
  } = useAppSelector((state) => state.ui);

  const [loadError, setLoadError] = useState('');
  const silentSignIn = async () => {
    await dispatch(appThunks.initializeUserPreferencesThunk());
    await dispatch(authThunks.silentSignInThunk());
    await dispatch(authThunks.refreshTokensThunk());
  };

  const onLinkCopiedModalClosed = () => dispatch(uiActions.setIsLinkCopiedModalOpen(false));
  const onDeleteAccountModalClosed = () => dispatch(uiActions.setIsDeleteAccountModalOpen(false));
  const onEditNameModalClosed = () => dispatch(uiActions.setIsEditNameModalOpen(false));
  const onChangeProfilePictureModalClosed = () => dispatch(uiActions.setIsChangeProfilePictureModalOpen(false));
  const onLanguageModalClosed = () => dispatch(uiActions.setIsLanguageModalOpen(false));
  const onPlansModalClosed = () => dispatch(uiActions.setIsPlansModalOpen(false));
  const handleAppStateChange = (state: AppStateStatus) => {
    if (state === 'active') {
      dispatch(appActions.setLastScreenLock(Date.now()));
      dispatch(authThunks.refreshTokensThunk());
      dispatch(paymentsThunks.checkShouldDisplayBilling());
    }

    if (state === 'inactive') {
      dispatch(appThunks.lockScreenIfNeededThunk());
    }

    if (Platform.OS === 'android' && state === 'background') {
      dispatch(appThunks.lockScreenIfNeededThunk());
    }
  };

  const onUserLoggedIn = () => {
    dispatch(appThunks.initializeThunk());
    // Refresh the auth tokens if the app comes to the foreground
    listener = appService.onAppStateChange(handleAppStateChange);
  };
  const onUserLoggedOut = () => {
    listener !== null && listener.remove();
    /**
     *
     * Commented on 1.5.20 Release - 6/10/2022
     *
     * This was causing a lot of problems
     * during the logout, commented out
     * until I figure out why this was here and if is needed,
     * probably not since no crashes/inconsistent states were
     * found since it was commented
     */
    //dispatch(appThunks.initializeThunk());
  };

  const handleUnlockScreen = () => {
    dispatch(appActions.setInitialScreenLocked(false));
    dispatch(appActions.setScreenLocked(false));
  };

  useEffect(() => {
    const subscription = Linking.addEventListener('url', onDeeplinkChange);

    return () => {
      subscription.remove();
    };
  }, []);

  const onDeeplinkChange: Linking.URLListener = (change) => {
    if (change.url.includes('checkout')) {
      dispatch(uiActions.setIsPlansModalOpen(false));
    }
  };

  const initializeApp = async () => {
    try {
      logger.info(`--- Starting new app session at ${time.getFormattedDate(new Date(), 'dd/LL/yyyy - HH:mm')} ---`);

      // 1. Get remote updates
      await getRemoteUpdateIfAvailable();

      // 2. Check for updates every time the app becomes active, doesn't trigger when setted
      appService.onAppStateChange(async (state) => {
        if (state === 'active') {
          await getRemoteUpdateIfAvailable();
        }
      });

      // 3. Prepare the filesystem
      await fileSystemService.prepareFileSystem();

      // 4. Initialize all the services we need at start time
      const initializeOperations = [authService.init(), analyticsService.setup(), appService.logAppInfo()];

      await Promise.all(initializeOperations);
      // 5. Silent SignIn only if token is still valid
      await silentSignIn();
    } catch (err) {
      setLoadError((err as Error).message);
      errorService.reportError(err);
    } finally {
      setIsAppInitialized(true);
    }
  };

  // Initialize app
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setBackgroundColorAsync(whiteColor as ColorValue);
      NavigationBar.setButtonStyleAsync('dark');
    }

    authService.addLoginListener(onUserLoggedIn);
    authService.addLogoutListener(onUserLoggedOut);

    if (!isAppInitialized) {
      initializeApp();
    }

    return () => {
      authService.removeLoginListener(onUserLoggedIn);
      authService.removeLogoutListener(onUserLoggedOut);
    };
  }, []);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior="height" style={tailwind('flex-grow w-full')}>
          {isAppInitialized && fontsAreReady ? (
            <DriveContextProvider rootFolderId={user?.root_folder_id}>
              <Portal.Host>
                <LockScreen
                  locked={screenLocked}
                  lastScreenLock={lastScreenLock}
                  onScreenUnlocked={handleUnlockScreen}
                />

                {initialScreenLocked ? null : <Navigation />}
                <AppToast />

                <LinkCopiedModal isOpen={isLinkCopiedModalOpen} onClose={onLinkCopiedModalClosed} />
                <DeleteAccountModal isOpen={isDeleteAccountModalOpen} onClose={onDeleteAccountModalClosed} />
                <EditNameModal isOpen={isEditNameModalOpen} onClose={onEditNameModalClosed} />
                <ChangeProfilePictureModal
                  isOpen={isChangeProfilePictureModalOpen}
                  onClose={onChangeProfilePictureModalClosed}
                />
                <LanguageModal isOpen={isLanguageModalOpen} onClose={onLanguageModalClosed} />
                <PlansModal isOpen={isPlansModalOpen} onClose={onPlansModalClosed} />
              </Portal.Host>
            </DriveContextProvider>
          ) : (
            <View style={tailwind('items-center flex-1 justify-center')}>
              {loadError ? <Text>{loadError}</Text> : null}
            </View>
          )}
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
