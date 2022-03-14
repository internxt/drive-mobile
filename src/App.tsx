import React, { useEffect, useRef, useState } from 'react';
import { View, Text, SafeAreaView } from 'react-native';
import Portal from '@burstware/react-native-portal';
import { LinkingOptions, NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import * as Unicons from '@iconscout/react-native-unicons';

import AppNavigator from './screens/AppNavigator';
import { analyticsSetup, trackStackScreen } from './services/analytics';
import { forceCheckUpdates, loadEnvVars, loadFonts, shouldForceUpdate } from './helpers';
import { getColor, tailwind } from './helpers/designSystem';
import { deviceStorage } from './services/asyncStorage';
import { authActions, authThunks } from './store/slices/auth';
import { appThunks } from './store/slices/app';
import { AppScreen } from './types';
import appService from './services/app';
import InviteFriendsModal from './components/modals/InviteFriendsModal';
import NewsletterModal from './components/modals/NewsletterModal';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { layoutActions } from './store/slices/layout';

process.nextTick = setImmediate;

export default function App(): JSX.Element {
  const dispatch = useAppDispatch();
  const [isAppInitialized, setIsAppInitialized] = useState(false);
  const { isInviteFriendsModalOpen, isNewsletterModalOpen } = useAppSelector((state) => state.layout);
  const [loadError, setLoadError] = useState('');
  const linking: LinkingOptions<ReactNavigation.RootParamList> = {
    prefixes: ['inxt'],
    config: {
      screens: {
        [AppScreen.TabExplorer]: AppScreen.TabExplorer,
        checkout: AppScreen.Billing,
      },
    },
  };
  const loadLocalUser = async () => {
    const token = await deviceStorage.getToken();
    const photosToken = await deviceStorage.getItem('photosToken');
    const user = await deviceStorage.getUser();

    if (token && photosToken && user) {
      dispatch(authActions.signIn({ token, photosToken, user }));

      dispatch(appThunks.initializeThunk());
    } else {
      dispatch(authThunks.signOutThunk());
    }
  };

  // Initialize app
  useEffect(() => {
    if (!isAppInitialized) {
      Promise.all([loadFonts(), loadEnvVars(), analyticsSetup(), loadLocalUser()])
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
    <View style={tailwind('h-full w-full bg-white')}>
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
                route && trackStackScreen(route, navigationRef.getCurrentRoute()?.params);
              }

              routeNameRef.current = currentRouteName;
            }}
            linking={linking}
            fallback={<View></View>}
            theme={{
              dark: false,
              colors: {
                primary: '#091e42' as string,
                background: '#FFFFFF' as string,
                card: '#FFFFFF' as string,
                border: '#091e42' as string,
                notification: '#091e42' as string,
                text: '#091e42' as string,
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

          <Toast config={toastConfig} ref={(ref) => Toast.setRef(ref)} />

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
    </View>
  );
}

const toastConfig = {
  success: function successToast({ text1 }: any) {
    return (
      <View style={tailwind('flex flex-row items-center bg-blue-100 p-3 w-full h-16')}>
        <View>
          <Unicons.UilCheckCircle color={getColor('green-50')} size={24} />
        </View>
        <View style={tailwind('flex-grow ml-3')}>
          <Text style={tailwind('text-white')}>{text1}</Text>
        </View>
      </View>
    );
  },
  error: function errorToast({ text1 }: any) {
    return (
      <View style={tailwind('flex flex-row items-center bg-red-60 p-3 w-full h-16')}>
        <View>
          <Unicons.UilTimesCircle color={getColor('white')} size={24} />
        </View>
        <View style={tailwind('flex-grow ml-3')}>
          <Text style={tailwind('text-white')}>{text1}</Text>
        </View>
      </View>
    );
  },
  warn: function warnToast({ text1 }: any) {
    return (
      <View style={tailwind('flex flex-row items-center bg-yellow-30 p-3 w-full h-16')}>
        <View>
          <Unicons.UilExclamationTriangle color={getColor('neutral-900')} size={24} />
        </View>
        <View style={tailwind('flex-grow ml-3')}>
          <Text style={tailwind('text-neutral-900')}>{text1}</Text>
        </View>
      </View>
    );
  },
};
