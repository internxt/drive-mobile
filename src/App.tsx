import React, { useEffect, useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ColorValue } from 'react-native';
import Portal from '@burstware/react-native-portal';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';

import analyticsService from './services/AnalyticsService';
import { forceCheckUpdates, loadFonts, shouldForceUpdate } from './helpers';
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
import languageService from './services/LanguageService';
import PlansModal from './components/modals/PlansModal';
import CancelSubscriptionModal from './components/modals/CancelSubscriptionModal';

export default function App(): JSX.Element {
  const dispatch = useAppDispatch();
  const tailwind = useTailwind();
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
    isCancelSubscriptionModalOpen,
  } = useAppSelector((state) => state.ui);
  const [loadError, setLoadError] = useState('');
  const silentSignIn = async () => {
    dispatch(authThunks.silentSignInThunk());
  };
  const onLinkCopiedModalClosed = () => dispatch(uiActions.setIsLinkCopiedModalOpen(false));
  const onInviteFriendsModalClosed = () => dispatch(uiActions.setIsInviteFriendsModalOpen(false));
  const onNewsletterModalClosed = () => dispatch(uiActions.setIsNewsletterModalOpen(false));
  const onDeleteAccountModalClosed = () => dispatch(uiActions.setIsDeleteAccountModalOpen(false));
  const onEditNameModalClosed = () => dispatch(uiActions.setIsEditNameModalOpen(false));
  const onChangeProfilePictureModalClosed = () => dispatch(uiActions.setIsChangeProfilePictureModalOpen(false));
  const onLanguageModalClosed = () => dispatch(uiActions.setIsLanguageModalOpen(false));
  const onPlansModalClosed = () => dispatch(uiActions.setIsPlansModalOpen(false));
  const onCancelSubscriptionModalClosed = () => dispatch(uiActions.setIsCancelSubscriptionModalOpen(false));
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
      Promise.all([loadFonts(), languageService.initialize(), silentSignIn(), analyticsService.setup()])
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
            <EditNameModal isOpen={isEditNameModalOpen} onClose={onEditNameModalClosed} />
            <ChangeProfilePictureModal
              isOpen={isChangeProfilePictureModalOpen}
              onClose={onChangeProfilePictureModalClosed}
            />
            <LanguageModal isOpen={isLanguageModalOpen} onClose={onLanguageModalClosed} />
            <PlansModal isOpen={isPlansModalOpen} onClose={onPlansModalClosed} />
            <CancelSubscriptionModal isOpen={isCancelSubscriptionModalOpen} onClose={onCancelSubscriptionModalClosed} />
          </View>
        </Portal.Host>
      </KeyboardAvoidingView>
    </SafeAreaProvider>
  );
}
