import { useState } from 'react';
import { Dimensions, Linking, TouchableOpacity, View } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { WarningCircle } from 'phosphor-react-native';
import { ScrollView } from 'react-native-gesture-handler';

import AppText from 'src/components/AppText';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../assets/lang/strings';
import AppButton from '../../components/AppButton';
import AppScreen from '../../components/AppScreen';
import AppVersionWidget from '../../components/AppVersionWidget';
import { useTheme } from '../../contexts/Theme/Theme.context';
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
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [error, setError] = useState<string>('');
  const dimensions = Dimensions.get('screen');

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

  const onTermsAndConditionsPressed = async () => {
    try {
      const termsUrl = 'https://internxt.com/legal';
      const canOpen = await Linking.canOpenURL(termsUrl);
      if (canOpen) {
        await Linking.openURL(termsUrl);
      }
    } catch (err) {
      logger.error('Error opening terms and conditions URL', err);
    }
  };

  const onNeedHelpPressed = async () => {
    try {
      const helpUrl = 'https://help.internxt.com';
      const canOpen = await Linking.canOpenURL(helpUrl);
      if (canOpen) {
        await Linking.openURL(helpUrl);
      }
    } catch (err) {
      logger.error('Error opening help URL', err);
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
      style={[tailwind('h-full px-6'), { backgroundColor: isDark ? 'transparent' : getColor('bg-surface') }]}
    >
      {isDark && (
        <LinearGradient
          colors={['#1C1C1C', '#031632']}
          locations={[0, 1]}
          style={[tailwind('w-full h-full absolute'), { height: dimensions.height, width: dimensions.width }]}
        />
      )}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[tailwind('flex-grow px-6'), { backgroundColor: 'transparent' }]}
      >
        <AppVersionWidget displayLogo style={tailwind('mb-5')} />
        <View style={tailwind('flex-grow justify-center')}>
          <View style={tailwind('flex mb-5')}>
            <AppText medium style={[tailwind('text-2xl'), { color: getColor('text-gray-100') }]}>
              {strings.screens.SignInScreen.title}
            </AppText>
          </View>

          <View style={tailwind('items-center')}>
            <AppButton
              style={tailwind('w-full py-0 h-11')}
              type="accept"
              onPress={onSignInWithBrowserPressed}
              title={strings.buttons.sign_in}
            />
            <View
              style={[tailwind('w-full border-b my-6'), { borderBottomColor: isDark ? '#474747' : '#E5E5EB' }]}
            ></View>
            <AppText
              style={[
                tailwind('text-sm mb-3 text-center'),
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
              type="secondary"
              onPress={onSignUpWithBrowserPressed}
              title={strings.buttons.sing_up}
            />
          </View>
          {renderErrorMessage()}
        </View>

        <View style={tailwind('mt-auto pb-4 items-center')}>
          <TouchableOpacity onPress={onTermsAndConditionsPressed} style={tailwind('py-2')}>
            <AppText style={[tailwind('text-base'), { color: getColor('text-primary') }]}>
              {strings.screens.SignInScreen.termsAndConditions}
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity onPress={onNeedHelpPressed} style={tailwind('pb-2')}>
            <AppText style={[tailwind('text-base'), { color: getColor('text-primary') }]}>
              {strings.screens.SignInScreen.needHelp}
            </AppText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </AppScreen>
  );
}

export default SignInScreen;
