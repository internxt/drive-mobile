import { useState } from 'react';
import { Dimensions, TouchableOpacity, View } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { WarningCircleIcon } from 'phosphor-react-native';
import { ScrollView } from 'react-native-gesture-handler';

import AppText from 'src/components/AppText';
import strings from '../../../assets/lang/strings';
import AppButton from '../../components/AppButton';
import AppScreen from '../../components/AppScreen';
import AppVersionWidget from '../../components/AppVersionWidget';
import { useTheme } from '../../contexts/Theme/Theme.context';
import { openUrl } from '../../helpers/utils';
import useGetColor from '../../hooks/useColor';
import { useLanguage } from '../../hooks/useLanguage';
import analytics, { AnalyticsEventKey } from '../../services/AnalyticsService';
import appService from '../../services/AppService';
import errorService from '../../services/ErrorService';
import notificationsService from '../../services/NotificationsService';
import { NotificationType } from '../../types';

function SignInScreen(): JSX.Element {
  const getColor = useGetColor();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  useLanguage();

  const [error, setError] = useState<string>('');
  const dimensions = Dimensions.get('screen');

  const onSignInWithBrowserPressed = () => {
    openUrl(appService.urls.webAuth.login, (err) => {
      const errorMessage = errorService.castError(err).message;
      notificationsService.show({ type: NotificationType.Error, text1: strings.screens.SignInScreen.errorOpeningLink });
      setError(errorMessage);
    });
    analytics.track(AnalyticsEventKey.UserSignIn, { method: 'browser' });
  };

  const onSignUpWithBrowserPressed = () => {
    openUrl(appService.urls.webAuth.signup, (err) => {
      const errorMessage = errorService.castError(err).message;
      notificationsService.show({ type: NotificationType.Error, text1: strings.screens.SignUpScreen.errorOpeningLink });
      setError(errorMessage);
    });
    analytics.track(AnalyticsEventKey.UserSignUp, { method: 'browser' });
  };

  const onNeedHelpPressed = () => {
    openUrl(appService.urls.help);
  };

  const renderErrorMessage = () => {
    if (!error) {
      return null;
    }

    return (
      <View className="flex flex-row items-center mt-0.5">
        <WarningCircleIcon weight="fill" color={getColor('text-red')} size={13} />
        <AppText className="text-sm ml-1" style={{ color: getColor('text-red') }}>
          {error}
        </AppText>
      </View>
    );
  };

  return (
    <AppScreen
      safeAreaTop
      className="h-full px-6"
      style={{ backgroundColor: isDark ? 'transparent' : getColor('bg-surface') }}
    >
      {isDark ? (
        <LinearGradient
          colors={['#1C1C1C', '#031632']}
          locations={[0, 1]}
          className="w-full h-full absolute"
          style={{ height: dimensions.height, width: dimensions.width }}
        />
      ) : (
        <LinearGradient
          colors={['rgba(249, 249, 252, 0)', '#f9f9fc']}
          locations={[0, 1]}
          className="w-full h-full absolute"
          style={{ height: dimensions.height, width: dimensions.width }}
        />
      )}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="flex-grow px-6"
        contentContainerStyle={{ backgroundColor: 'transparent' }}
      >
        <AppVersionWidget displayLogo className="mb-5" />
        <View className="flex-grow justify-center">
          <View className="flex mb-5">
            <AppText medium className="text-2xl" style={{ color: getColor('text-gray-100') }}>
              {strings.screens.SignInScreen.title}
            </AppText>
          </View>

          <View className="items-center">
            <AppButton
              className="w-full py-0 h-11"
              type="accept"
              onPress={onSignInWithBrowserPressed}
              title={strings.buttons.sign_in}
            />
            <View className="w-full border-b my-6" style={{ borderBottomColor: isDark ? '#474747' : '#E5E5EB' }}></View>
            <AppText
              className="text-base mb-3 text-center"
              style={{
                backgroundColor: 'transparent',
                color: getColor('text-gray-80'),
              }}
              medium
            >
              {strings.screens.SignInScreen.no_register}
            </AppText>

            <AppButton
              className="w-full py-0 h-11"
              type="secondary"
              onPress={onSignUpWithBrowserPressed}
              title={strings.buttons.sing_up}
            />
          </View>
          {renderErrorMessage()}
        </View>

        <View className="mt-auto pb-4 items-center">
          <TouchableOpacity onPress={onNeedHelpPressed} className="pb-6">
            <AppText className="text-base" style={{ color: getColor('text-primary') }} medium>
              {strings.screens.SignInScreen.needHelp}
            </AppText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </AppScreen>
  );
}

export default SignInScreen;
