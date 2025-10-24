import { useState } from 'react';
import { Linking, View } from 'react-native';

import { useKeyboard } from '@internxt-mobile/hooks/useKeyboard';
import { WarningCircle } from 'phosphor-react-native';
import { ScrollView } from 'react-native-gesture-handler';

import AppText from 'src/components/AppText';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../assets/lang/strings';
import AppButton from '../../components/AppButton';
import AppScreen from '../../components/AppScreen';
import AppVersionWidget from '../../components/AppVersionWidget';
import useGetColor from '../../hooks/useColor';
import analytics, { AnalyticsEventKey } from '../../services/AnalyticsService';
import appService from '../../services/AppService';
import { logger } from '../../services/common';
import errorService from '../../services/ErrorService';
import notificationsService from '../../services/NotificationsService';
import { NotificationType } from '../../types';
import { RootStackScreenProps } from '../../types/navigation';

function SignInScreen({ navigation }: RootStackScreenProps<'SignIn'>): JSX.Element {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  const { keyboardShown } = useKeyboard();
  const [error, setError] = useState<string>('');

  const onSignInWithBrowserPressed = async () => {
    try {
      const webAuthUrl = appService.urls.webAuth.login;
      const canOpen = await Linking.canOpenURL(webAuthUrl);
      if (canOpen) {
        await Linking.openURL(webAuthUrl);

        analytics.track(AnalyticsEventKey.UserSignIn, {
          method: 'browser',
        });
      } else {
        notificationsService.show({
          type: NotificationType.Error,
          text1: strings.screens.SignInScreen.errorOpeningLink,
        });
      }
    } catch (err) {
      const errorMessage = errorService.castError(err).message;
      logger.error('Error opening web auth URL', err);
      setError(errorMessage);
    }
  };
  const onSignUpWithBrowserPressed = async () => {
    try {
      const webAuthUrl = appService.urls.webAuth.signup;

      const canOpen = await Linking.canOpenURL(webAuthUrl);

      if (canOpen) {
        await Linking.openURL(webAuthUrl);

        analytics.track(AnalyticsEventKey.UserSignUp, {
          method: 'browser',
        });
      } else {
        notificationsService.show({
          type: NotificationType.Error,
          text1: strings.screens.SignUpScreen.errorOpeningLink,
        });
      }
    } catch (err) {
      const errorMessage = errorService.castError(err).message;
      logger.error('Error opening web sign up URL', err);
      setError(errorMessage);
    }
  };

  const renderErrorMessage = () => {
    if (!error) {
      return null;
    }

    return (
      <View style={tailwind('flex flex-row items-center mt-0.5')}>
        <WarningCircle weight="fill" color={getColor('text-red')} size={13} />
        <AppText style={[tailwind('text-sm ml-1'), { color: getColor('text-red') }]}>{error}</AppText>
      </View>
    );
  };

  return (
    <AppScreen
      safeAreaTop
      safeAreaBottom
      style={[tailwind('h-full px-6'), { backgroundColor: getColor('bg-surface') }]}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[tailwind('flex-grow px-6'), { backgroundColor: getColor('bg-surface') }]}
      >
        <View style={tailwind('h-12')} />

        <View>
          <View style={tailwind('mb-5')}>
            <AppText medium style={[tailwind('text-2xl'), { color: getColor('text-gray-100') }]}>
              {strings.screens.SignInScreen.title}
            </AppText>
          </View>

          <View style={tailwind('items-center')}>
            <AppButton
              style={tailwind('w-full py-0 mb-4 h-11')}
              type="white"
              onPress={onSignInWithBrowserPressed}
              title={strings.buttons.sign_in}
            />
            <AppText
              style={[
                tailwind('text-sm mb-4 text-center'),
                {
                  backgroundColor: 'transparent',
                  color: getColor('text-gray-80'),
                },
              ]}
            >
              {strings.screens.SignInScreen.no_register}
            </AppText>

            <AppButton
              style={tailwind('w-full py-0 h-11')}
              type="white"
              onPress={onSignUpWithBrowserPressed}
              title={strings.buttons.sing_up}
            />
          </View>
          {renderErrorMessage()}
        </View>
        {keyboardShown ? null : <AppVersionWidget displayLogo style={tailwind('mb-5 mt-auto')} />}
      </ScrollView>
    </AppScreen>
  );
}

export default SignInScreen;
