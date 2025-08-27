import { useKeyboard } from '@internxt-mobile/hooks/useKeyboard';
import { ScrollView, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../assets/lang/strings';
import AppButton from '../../components/AppButton';
import AppScreen from '../../components/AppScreen';
import AppText from '../../components/AppText';
import AppVersionWidget from '../../components/AppVersionWidget';
import SignUpForm from '../../components/forms/SignUpForm';
import useGetColor from '../../hooks/useColor';
import { RootStackScreenProps } from '../../types/navigation';

function SignUpScreen({ navigation }: RootStackScreenProps<'SignUp'>): JSX.Element {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  const { keyboardShown } = useKeyboard();

  const onGoToSignInButtonPressed = () => {
    navigation.canGoBack() ? navigation.goBack() : navigation.replace('SignIn');
  };

  const onFormSubmitSuccess = () => {
    navigation.replace('TabExplorer', { screen: 'Home' });
  };

  return (
    <AppScreen safeAreaBottom safeAreaTop style={{ backgroundColor: getColor('bg-surface') }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={[tailwind('px-6 flex-1'), { backgroundColor: getColor('bg-surface') }]}
        contentContainerStyle={[tailwind('flex-grow'), { backgroundColor: getColor('bg-surface') }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={tailwind('h-12')} />

        <View style={tailwind('mb-5')}>
          <AppText medium style={[tailwind('text-2xl'), { color: getColor('text-gray-100') }]}>
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

        <View
          style={[
            tailwind('my-6 w-full'),
            {
              borderBottomWidth: 1,
              borderBottomColor: getColor('border-gray-10'),
            },
          ]}
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
          {strings.screens.SignUpScreen.alreadyHaveAccount}
        </AppText>

        <AppButton
          style={tailwind('w-full py-0 h-11')}
          type="white"
          onPress={onGoToSignInButtonPressed}
          title={strings.buttons.sign_in}
        />

        {keyboardShown ? null : <AppVersionWidget displayLogo style={tailwind('mb-5 mt-auto')} />}
      </ScrollView>
    </AppScreen>
  );
}

export default SignUpScreen;
