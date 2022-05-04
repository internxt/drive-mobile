import React, { useEffect, useRef, useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform } from 'react-native';
import Portal from '@burstware/react-native-portal';
import { LinkingOptions, NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';

import AppNavigator from './screens/AppNavigator';
import analyticsService from './services/analytics';
import { forceCheckUpdates, loadFonts, shouldForceUpdate } from './helpers';
import { getColor, tailwind } from './helpers/designSystem';
import { asyncStorage } from './services/asyncStorage';
import { authActions, authThunks } from './store/slices/auth';
import { appThunks } from './store/slices/app';
import { AppScreenKey, AsyncStorageKey } from './types';
import appService from './services/app';
import InviteFriendsModal from './components/modals/InviteFriendsModal';
import NewsletterModal from './components/modals/NewsletterModal';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { uiActions } from './store/slices/ui';
import { driveActions } from './store/slices/drive';
import SortModal from './components/modals/SortModal';
import AppToast from './components/AppToast';
import LinkCopiedModal from './components/modals/LinkCopiedModal';

export default function App(): JSX.Element {
  const dispatch = useAppDispatch();
  const [isAppInitialized, setIsAppInitialized] = useState(false);
  const { isLinkCopiedModalOpen, isInviteFriendsModalOpen, isNewsletterModalOpen } = useAppSelector(
    (state) => state.ui,
  );
  const [loadError, setLoadError] = useState('');
  const linking: LinkingOptions<ReactNavigation.RootParamList> = {
    prefixes: ['inxt'],
    config: {
      screens: {
        [AppScreenKey.TabExplorer]: AppScreenKey.TabExplorer,
        checkout: AppScreenKey.Billing,
      },
    },
  };
  const loadLocalUser = async () => {
    const token = await asyncStorage.getItem(AsyncStorageKey.Token);
    const photosToken = await asyncStorage.getItem(AsyncStorageKey.PhotosToken);
    const user = await asyncStorage.getUser();

    if (token && photosToken && user) {
      dispatch(driveActions.setCurrentFolderId(user.root_folder_id));
      dispatch(authActions.signIn({ token, photosToken, user }));

      dispatch(appThunks.initializeThunk());
    } else {
      dispatch(authThunks.signOutThunk());
    }
  };
  const onLinkCopiedModalClosed = () => dispatch(uiActions.setIsLinkCopiedModalOpen(false));
  const onInviteFriendsModalClosed = () => dispatch(uiActions.setIsInviteFriendsModalOpen(false));
  const onNewsletterModalClosed = () => dispatch(uiActions.setIsNewsletterModalOpen(false));

  // Initialize app
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setBackgroundColorAsync(getColor('white'));
      NavigationBar.setButtonStyleAsync('dark');
    }

    if (!isAppInitialized) {
      Promise.all([loadFonts(), loadLocalUser(), analyticsService.setup()])
        .then(() => {
          setIsAppInitialized(true);
        })
        .catch((err: Error) => {
          setLoadError(err.message);
        });
    }

    shouldForceUpdate()
      .then((shouldForce) => {
        if (shouldForce && appService.constants.NODE_ENV === 'production') {
          forceCheckUpdates();
        }
      })
      .catch(() => undefined);
  }, []);

  const navigationRef = useNavigationContainerRef();
  const routeNameRef = useRef<string>();

  return (
    <SafeAreaProvider>
      <KeyboardAvoidingView behavior="height" style={tailwind('flex-grow w-full')}>
        <Portal.Host>
          <View style={tailwind('flex-1')}>
            <NavigationContainer
              ref={navigationRef}
              onReady={() => {
                const currentRoute = navigationRef.getCurrentRoute();

                routeNameRef.current = currentRoute && currentRoute.name;
              }}
              onStateChange={(route) => {
                const previousRouteName = routeNameRef.current;
                const currentRouteName = navigationRef.getCurrentRoute()?.name;

                if (previousRouteName !== currentRouteName) {
                  route && analyticsService.trackStackScreen(route, navigationRef.getCurrentRoute()?.params);
                }

                routeNameRef.current = currentRouteName;
              }}
              linking={linking}
              fallback={<View></View>}
              theme={{
                dark: false,
                colors: {
                  primary: getColor('neutral-900'),
                  background: getColor('white'),
                  card: getColor('white'),
                  border: getColor('neutral-900'),
                  notification: getColor('neutral-900'),
                  text: getColor('neutral-900'),
                },
              }}
            >
              {isAppInitialized ? (
                <AppNavigator />
              ) : (
                <View style={tailwind('items-center flex-1 justify-center')}>
                  {loadError ? <Text>{loadError}</Text> : null}
                </View>
              )}
            </NavigationContainer>

            <AppToast />

            <SortModal />
            <LinkCopiedModal isOpen={isLinkCopiedModalOpen} onClosed={onLinkCopiedModalClosed} />
            <InviteFriendsModal isOpen={isInviteFriendsModalOpen} onClosed={onInviteFriendsModalClosed} />
            <NewsletterModal isOpen={isNewsletterModalOpen} onClosed={onNewsletterModalClosed} />
          </View>
        </Portal.Host>
      </KeyboardAvoidingView>
    </SafeAreaProvider>
  );
}
