import React from 'react';
import { View, ScrollView } from 'react-native';

import strings from '../../../assets/lang/strings';
import InternxtLogo from '../../../assets/logo.svg';
import AppScreen from '../../components/AppScreen';
import AppText from '../../components/AppText';
import { RootStackScreenProps } from '../../types/navigation';
import { useTailwind } from 'tailwind-rn';
import AppButton from '../../components/AppButton';
import SignUpForm from '../../components/forms/SignUpForm';

function SignUpScreen({ navigation }: RootStackScreenProps<'SignUp'>): JSX.Element {
  const tailwind = useTailwind();
  const onGoToSignInButtonPressed = () => navigation.replace('SignIn');
  const onFormSubmitSuccess = () => {
    navigation.replace('TabExplorer', { screen: 'Home', showReferralsBanner: true });
  };

  return (
    <AppScreen safeAreaBottom safeAreaTop>
      <ScrollView style={tailwind('px-6')}>
        <View style={tailwind('pb-6')}>
          <View style={tailwind('items-center mt-2')}>
            <InternxtLogo width={120} height={40} />
          </View>
          <View>
            <AppText style={tailwind('text-sm text-center')}>
              {strings.screens.SignUpScreen.create_account_title}
            </AppText>
          </View>
        </View>

        <SignUpForm
          onFormSubmitSuccess={onFormSubmitSuccess}
          renderActionsContainer={({ onSubmitButtonPressed, isValid, isLoading }) => (
            <AppButton
              testID="sign-up-button"
              type="accept"
              disabled={!isValid || isLoading}
              style={[tailwind('py-4 my-4')]}
              title={isLoading ? strings.buttons.creating_button : strings.buttons.createAccount}
              onPress={onSubmitButtonPressed}
            />
          )}
        />

        <AppText style={tailwind('text-center mb-10')} onPress={onGoToSignInButtonPressed}>
          <AppText style={tailwind('text-sm text-blue-60')}>{strings.screens.SignInScreen.title}</AppText>
        </AppText>
      </ScrollView>
    </AppScreen>
  );
}

export default SignUpScreen;
