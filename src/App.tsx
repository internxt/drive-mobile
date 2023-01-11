import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ColorValue,
  AppStateStatus,
  NativeEventSubscription,
} from 'react-native';
import Portal from '@burstware/react-native-portal';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';

import analyticsService from './services/AnalyticsService';
import { getRemoteUpdateIfAvailable, useLoadFonts } from './helpers';
import { authThunks } from './store/slices/auth';
import { appThunks } from './store/slices/app';
import appService from './services/AppService';
import InviteFriendsModal from './components/modals/InviteFriendsModal';
import NewsletterModal from './components/modals/NewsletterModal';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { uiActions } from './store/slices/ui';
import AppToast from './components/AppToast';
import LinkCopiedModal from './components/modals/LinkCopiedModal';
import Navigation from './navigation';
import { useTailwind } from 'tailwind-rn';
import DeleteAccountModal from './components/modals/DeleteAccountModal';
import authService from './services/AuthService';
import EditNameModal from './components/modals/EditNameModal';
import ChangeProfilePictureModal from './components/modals/ChangeProfilePictureModal';
import LanguageModal from './components/modals/LanguageModal';
import PlansModal from './components/modals/PlansModal';
import * as Linking from 'expo-linking';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import fileSystemService from './services/FileSystemService';
import { PhotosContextProvider } from './contexts/Photos';
import errorService from './services/ErrorService';
import { DriveContextProvider } from './contexts/Drive/Drive.context';
let listener: NativeEventSubscription | null = null;
export default function App(): JSX.Element {
  const dispatch = useAppDispatch();
  const tailwind = useTailwind();
  const { isReady: fontsAreReady, error } = useLoadFonts();
  const { user } = useAppSelector((state) => state.auth);
  const { color: whiteColor } = tailwind('text-white');
  const [isAppInitialized, setIsAppInitialized] = useState(false);
  const {
    isLinkCopiedModalOpen,
    isInviteFriendsModalOpen,
    isNewsletterModalOpen,
    isDeleteAccountModalOpen,
    isEditNameModalOpen,
    isChangeProfilePictureModalOpen,
    isLanguageModalOpen,
    isPlansModalOpen,
  } = useAppSelector((state) => state.ui);
  const [loadError, setLoadError] = useState('');
  const silentSignIn = async () => {
    dispatch(authThunks.silentSignInThunk());
    dispatch(authThunks.refreshTokensThunk());
  };

  const onLinkCopiedModalClosed = () => dispatch(uiActions.setIsLinkCopiedModalOpen(false));
  const onInviteFriendsModalClosed = () => dispatch(uiActions.setIsInviteFriendsModalOpen(false));
  const onNewsletterModalClosed = () => dispatch(uiActions.setIsNewsletterModalOpen(false));
  const onDeleteAccountModalClosed = () => dispatch(uiActions.setIsDeleteAccountModalOpen(false));
  const onEditNameModalClosed = () => dispatch(uiActions.setIsEditNameModalOpen(false));
  const onChangeProfilePictureModalClosed = () => dispatch(uiActions.setIsChangeProfilePictureModalOpen(false));
  const onLanguageModalClosed = () => dispatch(uiActions.setIsLanguageModalOpen(false));
  const onPlansModalClosed = () => dispatch(uiActions.setIsPlansModalOpen(false));
  function handleAppStateChange(state: AppStateStatus) {
    if (state === 'active') {
      dispatch(authThunks.refreshTokensThunk());
    }
  }
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
      // 1. Get remote updates
      await getRemoteUpdateIfAvailable();

      // 2. Check for updates every time the app becomes active, doesn't trigger when setted
      appService.onAppStateChange(async (state) => {
        if (state === 'active') {
          await getRemoteUpdateIfAvailable();
        }
      });

      // 3. Prepare the TMP dir
      await fileSystemService.prepareTmpDir();

      // 4. Initialize all the services we need at start time
      const initializeOperations = [authService.init(), analyticsService.setup()];

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
          <View style={tailwind('flex-1')}>
            {isAppInitialized && fontsAreReady ? (
              <DriveContextProvider rootFolderId={user?.root_folder_id}>
                <PhotosContextProvider>
                  <Portal.Host>
                    <Navigation />
                    <AppToast />

                    <LinkCopiedModal isOpen={isLinkCopiedModalOpen} onClose={onLinkCopiedModalClosed} />
                    <InviteFriendsModal isOpen={isInviteFriendsModalOpen} onClose={onInviteFriendsModalClosed} />
                    <NewsletterModal isOpen={isNewsletterModalOpen} onClose={onNewsletterModalClosed} />
                    <DeleteAccountModal isOpen={isDeleteAccountModalOpen} onClose={onDeleteAccountModalClosed} />
                    <EditNameModal isOpen={isEditNameModalOpen} onClose={onEditNameModalClosed} />
                    <ChangeProfilePictureModal
                      isOpen={isChangeProfilePictureModalOpen}
                      onClose={onChangeProfilePictureModalClosed}
                    />
                    <LanguageModal isOpen={isLanguageModalOpen} onClose={onLanguageModalClosed} />
                    <PlansModal isOpen={isPlansModalOpen} onClose={onPlansModalClosed} />
                  </Portal.Host>
                </PhotosContextProvider>
              </DriveContextProvider>
            ) : (
              <View style={tailwind('items-center flex-1 justify-center')}>
                {loadError ? <Text>{loadError}</Text> : null}
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
