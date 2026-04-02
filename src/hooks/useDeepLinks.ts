import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainerRef } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { LARGE_SHARE_DEEP_LINK } from 'src/navigation/AppLinks';
import { handleLargeShareDeepLink } from 'src/shareExtension/hooks/useIosPendingShareHandoff';
import { useAppDispatch } from 'src/store/hooks';
import { driveActions } from 'src/store/slices/drive';
import { paymentsThunks } from 'src/store/slices/payments';
import { storageThunks } from 'src/store/slices/storage';
import { uiActions } from 'src/store/slices/ui';
import { RootStackParamList } from 'src/types/navigation';

export const useDeepLinks = (
  navigationContainerRef: NavigationContainerRef<RootStackParamList> | undefined,
  isLoggedIn: boolean | null,
) => {
  const dispatch = useAppDispatch();

  const isLoggedInRef = useRef(isLoggedIn);
  useEffect(() => {
    isLoggedInRef.current = isLoggedIn;
  }, [isLoggedIn]);

  useEffect(() => {
    const onAppLinkOpened = async (event: Linking.EventType) => {
      if (Platform.OS === 'ios' && event.url.includes(LARGE_SHARE_DEEP_LINK)) {
        await handleLargeShareDeepLink(navigationContainerRef, isLoggedInRef.current, event.url);
        return;
      }

      if (isLoggedInRef.current) {
        const sessionId = await AsyncStorage.getItem('tmpCheckoutSessionId');
        const comesFromCheckout = !!sessionId && event.url.includes('checkout');
        if (comesFromCheckout) {
          await AsyncStorage.removeItem('tmpCheckoutSessionId');
          /**
           * We will update the UI in 5s since we don't have
           * realtime updates, good luck
           */
          setTimeout(() => {
            dispatch(paymentsThunks.loadUserSubscriptionThunk());
            dispatch(storageThunks.loadLimitThunk());
          }, 5000);
          dispatch(uiActions.setIsPlansModalOpen(false));
        }
      }

      if (event.url) {
        const regex = /inxt:\/\//g;
        if (event.url.match(/inxt:\/\/.*:\/*/g)) {
          const finalUri = event.url.replace(regex, '');
          dispatch(driveActions.setUri(finalUri));
        }
      }
    };

    const subscription = Linking.addEventListener('url', onAppLinkOpened);
    return () => subscription.remove();
  }, []);
};
