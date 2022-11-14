import React from 'react';
import { View, ScrollView } from 'react-native';
import strings from '../../../assets/lang/strings';
import AppScreen from '../../components/AppScreen';
import AppText from '../../components/AppText';
import { RootStackScreenProps } from '../../types/navigation';
import { useTailwind } from 'tailwind-rn';
import AppButton from '../../components/AppButton';
import SignUpForm from '../../components/forms/SignUpForm';
import AppVersionWidget from 'src/components/AppVersionWidget';

function SignUpScreen({ navigation }: RootStackScreenProps<'SignUp'>): JSX.Element {
  const tailwind = useTailwind();
  const onGoToSignInButtonPressed = () => {
    navigation.canGoBack() ? navigation.goBack() : navigation.replace('SignIn');
  };
  const onFormSubmitSuccess = () => {
    navigation.replace('TabExplorer', { screen: 'Home', showReferralsBanner: true });
  };

  return (
    <AppScreen safeAreaBottom safeAreaTop>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={tailwind('px-6')}
        contentContainerStyle={tailwind('h-full')}
      >
        <View style={tailwind('h-12')} />

        <View style={tailwind('mb-5')}>
          <AppText medium style={tailwind('text-2xl text-gray-100')}>
            {strings.screens.SignUpScreen.title}
          </AppText>
        </View>

        <SignUpForm
          onFormSubmitSuccess={onFormSubmitSuccess}
          renderActionsContainer={({ onSubmitButtonPressed, isLoading }) => (
            <AppButton
              testID="sign-up-button"
              type="accept"
              loading={isLoading}
              style={[tailwind('h-11 py-0 mt-2.5')]}
              title={strings.buttons.createAccount}
              onPress={onSubmitButtonPressed}
            />
          )}
        />

        <View style={tailwind('border-b border-gray-10 my-6 w-full')}></View>
        <AppText style={tailwind('text-sm bg-transparent mb-4 text-center')}>
          {strings.screens.SignUpScreen.alreadyHaveAccount}
        </AppText>
        <AppButton
          style={tailwind('w-full py-0 h-11')}
          type="white"
          onPress={onGoToSignInButtonPressed}
          title={strings.buttons.sign_in}
        />
      </ScrollView>
      <AppVersionWidget displayLogo style={tailwind('mb-5 mt-auto')} />
    </AppScreen>
  );
}

export default SignUpScreen;
