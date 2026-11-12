import React from 'react';

import InternxtLogo from '../../../assets/logo.svg';
import AppScreen from '../../components/AppScreen';
import AppButton from '../../components/AppButton';
import { useTailwind } from 'tailwind-rn';
import { CheckCircle } from 'phosphor-react-native';
import AppText from 'src/components/AppText';
import strings from 'assets/lang/strings';
import { Dimensions, Linking, View } from 'react-native';
import AppVersionWidget from 'src/components/AppVersionWidget';
import { LinearGradient } from 'expo-linear-gradient';
import appService from 'src/services/AppService';
import { useAppDispatch } from 'src/store/hooks';
import { authThunks } from 'src/store/slices/auth';

export function DeactivatedAccountScreen(): JSX.Element {
  const tailwind = useTailwind();
  const dispatch = useAppDispatch();

  const handleGoToSignIn = () => {
    dispatch(authThunks.signOutThunk({ reason: 'manual' }));
  };
  const handleGoToSignUp = async () => {
    const webAuthUrl = appService.urls.webAuth.signup;
    await Linking.openURL(webAuthUrl);
  };
  const dimensions = Dimensions.get('screen');
  return (
    <AppScreen safeAreaTop safeAreaBottom className="px-6 h-full items-center pt-20">
      <LinearGradient
        colors={['#F9F9FC', '#F9F9FC']}
        locations={[0, 1]}
        className="w-full h-full absolute"
        style={{ height: dimensions.height, width: dimensions.width }}
      />
      <CheckCircle weight="thin" color={tailwind('text-primary').color as string} size={88} />
      <AppText medium className="text-center text-2xl mt-6">
        {strings.screens.deactivation_screen.account_deleted}
      </AppText>
      <AppText className="text-center text-lg mt-2">
        {strings.screens.deactivation_screen.account_deleted_advice}
      </AppText>
      <AppButton
        className="w-full mt-8"
        title={strings.buttons.createAccount}
        type="accept"
        onPress={handleGoToSignUp}
      />
      <AppButton className="w-full mt-3" title={strings.buttons.sign_in} type="white" onPress={handleGoToSignIn} />
      <View className="mt-auto">
        <InternxtLogo width={90} style={tailwind('my-2')} />
        <AppVersionWidget className="mb-5" />
      </View>
    </AppScreen>
  );
}
