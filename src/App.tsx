import React, { useEffect, useRef, useState } from 'react';
import { View, Text, KeyboardAvoidingView } from 'react-native';
import Portal from '@burstware/react-native-portal';
import { LinkingOptions, NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';

import AppNavigator from './screens/AppNavigator';
import analyticsService from './services/analytics';
import { forceCheckUpdates, loadFonts, shouldForceUpdate } from './helpers';
import { getColor, tailwind } from './helpers/designSystem';
import { deviceStorage } from './services/asyncStorage';
import { authActions, authThunks } from './store/slices/auth';
import { appThunks } from './store/slices/app';
import { AppScreenKey } from './types';
import appService from './services/app';
import InviteFriendsModal from './components/modals/InviteFriendsModal';
import NewsletterModal from './components/modals/NewsletterModal';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { layoutActions } from './store/slices/layout';
import { storageActions } from './store/slices/storage';
import SortModal from './components/modals/SortModal';
import AppToast from './components/AppToast';

export default function App(): JSX.Element {
  const dispatch = useAppDispatch();
  const [isAppInitialized, setIsAppInitialized] = useState(false);
  const { isInviteFriendsModalOpen, isNewsletterModalOpen } = useAppSelector((state) => state.layout);
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
    const token = await deviceStorage.getToken();
    const photosToken = await deviceStorage.getItem('photosToken');
    const user = await deviceStorage.getUser();

    if (token && photosToken && user) {
      dispatch(storageActions.setCurrentFolderId(user.root_folder_id));
      dispatch(authActions.signIn({ token, photosToken, user }));

      dispatch(appThunks.initializeThunk());
    } else {
      dispatch(authThunks.signOutThunk());
    }
  };

  // Initialize app
  useEffect(() => {
    NavigationBar.setBackgroundColorAsync(getColor('white')).then(() => NavigationBar.setButtonStyleAsync('dark'));

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
            <InviteFriendsModal
              isOpen={isInviteFriendsModalOpen}
              onClosed={() => dispatch(layoutActions.setIsInviteFriendsModalOpen(false))}
            />
            <NewsletterModal
              isOpen={isNewsletterModalOpen}
              onClosed={() => dispatch(layoutActions.setIsNewsletterModalOpen(false))}
            />
          </View>
        </Portal.Host>
      </KeyboardAvoidingView>
    </SafeAreaProvider>
  );
}
