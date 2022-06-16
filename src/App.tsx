import React, { useEffect, useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ColorValue } from 'react-native';
import Portal from '@burstware/react-native-portal';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';

import analyticsService from './services/AnalyticsService';
import { forceCheckUpdates, loadFonts, shouldForceUpdate } from './helpers';
import asyncStorage from './services/AsyncStorageService';
import { authActions, authThunks } from './store/slices/auth';
import { appThunks } from './store/slices/app';
import appService from './services/AppService';
import { AsyncStorageKey } from './types';
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

export default function App(): JSX.Element {
  const dispatch = useAppDispatch();
  const tailwind = useTailwind();
  const { color: whiteColor } = tailwind('text-white');
  const [isAppInitialized, setIsAppInitialized] = useState(false);
  const { isLinkCopiedModalOpen, isInviteFriendsModalOpen, isNewsletterModalOpen, isDeleteAccountModalOpen } =
    useAppSelector((state) => state.ui);
  const [loadError, setLoadError] = useState('');
  const silentSignIn = async () => {
    dispatch(authThunks.silentSignInThunk());
  };
  const onLinkCopiedModalClosed = () => dispatch(uiActions.setIsLinkCopiedModalOpen(false));
  const onInviteFriendsModalClosed = () => dispatch(uiActions.setIsInviteFriendsModalOpen(false));
  const onNewsletterModalClosed = () => dispatch(uiActions.setIsNewsletterModalOpen(false));
  const onDeleteAccountModalClosed = () => dispatch(uiActions.setIsDeleteAccountModalOpen(false));
  const onUserLoggedIn = () => {
    dispatch(appThunks.initializeThunk());
  };
  const onUserLoggedOut = () => {
    dispatch(appThunks.initializeThunk());
  };

  // Initialize app
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setBackgroundColorAsync(whiteColor as ColorValue);
      NavigationBar.setButtonStyleAsync('dark');
    }

    if (!isAppInitialized) {
      Promise.all([loadFonts(), silentSignIn(), analyticsService.setup()])
        .then(() => {
          setIsAppInitialized(true);
        })
        .catch((err: Error) => {
          setLoadError(err.message);
        });
    }

    authService.addLoginListener(onUserLoggedIn);
    authService.addLogoutListener(onUserLoggedOut);

    shouldForceUpdate()
      .then((shouldForce) => {
        if (shouldForce && appService.constants.NODE_ENV === 'production') {
          forceCheckUpdates();
        }
      })
      .catch(() => undefined);

    return () => {
      authService.removeLoginListener(onUserLoggedIn);
      authService.removeLogoutListener(onUserLoggedOut);
    };
  }, []);

  return (
    <SafeAreaProvider>
      <KeyboardAvoidingView behavior="height" style={tailwind('flex-grow w-full')}>
        <Portal.Host>
          <View style={tailwind('flex-1')}>
            {isAppInitialized ? (
              <Navigation />
            ) : (
              <View style={tailwind('items-center flex-1 justify-center')}>
                {loadError ? <Text>{loadError}</Text> : null}
              </View>
            )}

            <AppToast />

            <LinkCopiedModal isOpen={isLinkCopiedModalOpen} onClose={onLinkCopiedModalClosed} />
            <InviteFriendsModal isOpen={isInviteFriendsModalOpen} onClose={onInviteFriendsModalClosed} />
            <NewsletterModal isOpen={isNewsletterModalOpen} onClose={onNewsletterModalClosed} />
            <DeleteAccountModal isOpen={isDeleteAccountModalOpen} onClose={onDeleteAccountModalClosed} />
          </View>
        </Portal.Host>
      </KeyboardAvoidingView>
    </SafeAreaProvider>
  );
}
