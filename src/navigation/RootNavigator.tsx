import { NavigationContainerRef } from '@react-navigation/native';
import { View } from 'react-native';

import { useAppSelector } from '../store/hooks';
import { RootStackParamList } from '../types/navigation';

import { useDeepLinks } from '../hooks/useDeepLinks';
import { useIosPendingShareHandoff } from '../shareExtension/hooks/useIosPendingShareHandoff';
import { AndroidShareSignInProvider } from '../shareExtension/AndroidShareSignInContext';
import { useAndroidShareIntent } from '../shareExtension/useAndroidShareIntent';
import AppStackNavigator from './AppStackNavigator';
import AuthStackNavigator from './AuthStackNavigator';

type Props = {
  navigationContainerRef?: NavigationContainerRef<RootStackParamList>;
};

function AppNavigator({ navigationContainerRef }: Readonly<Props>): JSX.Element {
  const isLoggedIn = useAppSelector((state) => state.auth.loggedIn);

  const { keepFilesUntilSignIn } = useAndroidShareIntent(navigationContainerRef, isLoggedIn);
  useIosPendingShareHandoff(navigationContainerRef, isLoggedIn);
  useDeepLinks(navigationContainerRef, isLoggedIn);

  if (isLoggedIn == null) return <View />;

  return (
    <AndroidShareSignInProvider keepFilesUntilSignIn={keepFilesUntilSignIn}>
      {isLoggedIn ? <AppStackNavigator /> : <AuthStackNavigator />}
    </AndroidShareSignInProvider>
  );
}

export default AppNavigator;
