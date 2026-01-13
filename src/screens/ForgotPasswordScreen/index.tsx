import { useEffect, useState } from 'react';
import { useColorScheme, View } from 'react-native';

import errorService from '@internxt-mobile/services/ErrorService';
import { EnvelopeSimple, WarningCircle } from 'phosphor-react-native';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../assets/lang/strings';
import AppButton from '../../components/AppButton';
import AppScreen from '../../components/AppScreen';
import AppText from '../../components/AppText';
import AppTextInput from '../../components/AppTextInput';
import useGetColor from '../../hooks/useColor';
import authService from '../../services/AuthService';
import validationService from '../../services/ValidationService';
import { RootStackScreenProps } from '../../types/navigation';

function ForgotPasswordScreen({ navigation }: RootStackScreenProps<'ForgotPassword'>): JSX.Element {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [currentContainer, setCurrentCointainer] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [email, setIsEmail] = useState('');

  useEffect(() => {
    setEmailError(undefined);
  }, [email]);

  const handleSendConfirmationButtonPress = async () => {
    setEmailError(undefined);
    if (!email) {
      setEmailError(strings.errors.requiredField);
      return;
    }
    const isValidEmailField = validationService.validateEmail(email);

    if (!isValidEmailField) {
      setEmailError(strings.errors.validEmail);
      return;
    }

    try {
      setIsLoading(true);
      await authService.reset(email);
      setCurrentCointainer(2);
    } catch (e) {
      errorService.reportError(e);
      setEmailError(strings.errors.deactivationAccount);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelButtonPress = () => {
    navigation.goBack();
  };

  const handleGoBackToSignIn = () => {
    navigation.goBack();
  };

  const getEmailError = () => {
    return (
      <View style={tailwind('flex flex-row items-center mt-1')}>
        <WarningCircle weight="fill" color={getColor('text-red')} size={13} />
        <AppText style={[tailwind('text-sm ml-1 leading-4'), { color: getColor('text-red') }]}>{emailError}</AppText>
      </View>
    );
  };

  if (currentContainer === 1) {
    return (
      <AppScreen safeAreaTop style={tailwind('h-full px-6')}>
        <View style={tailwind('h-12')} />
        <View style={tailwind('mb-4')}>
          <AppText medium style={[tailwind('text-2xl'), { color: getColor('text-gray-100') }]}>
            {strings.screens.forgot_password.title}
          </AppText>
        </View>
        <View style={tailwind('')}>
          <View>
            <View>
              <View
                style={[
                  tailwind('p-4 rounded-xl mb-4'),
                  {
                    backgroundColor: getColor('bg-gray-1'),
                    borderWidth: 1,
                    borderColor: getColor('border-gray-10'),
                  },
                ]}
              >
                <AppText style={[tailwind('text-sm'), { color: getColor('text-gray-100') }]}>
                  {strings.screens.forgot_password.message}
                </AppText>
              </View>
              <AppTextInput
                value={email}
                status={emailError ? ['error', getEmailError()] : undefined}
                onChangeText={(value) => setIsEmail(value)}
                placeholder={strings.inputs.email}
                maxLength={64}
                keyboardType="email-address"
                textContentType="emailAddress"
              />

              <AppButton
                loading={isLoading}
                type="accept"
                style={tailwind('mt-4')}
                onPress={handleSendConfirmationButtonPress}
                title={strings.buttons.sendDeleteAccountConfirmation}
              />
              <AppButton
                disabled={isLoading}
                type="white"
                style={tailwind('mt-4')}
                onPress={handleCancelButtonPress}
                title={strings.buttons.cancel}
              />
            </View>
          </View>
        </View>
      </AppScreen>
    );
  }

  if (currentContainer === 2) {
    return (
      <AppScreen style={tailwind('h-full px-6 justify-center')}>
        <View style={tailwind('flex items-center justify-center')}>
          <View
            style={[
              tailwind('rounded-full flex items-center justify-center mb-4'),
              {
                width: 100,
                height: 100,
                backgroundColor: getColor('bg-forgot-password-screen'),
                borderColor: getColor('border-color-forgot-password-screen'),
                borderWidth: 16,
              },
            ]}
          >
            <EnvelopeSimple size={46} weight="light" color={getColor('text-primary')} />
          </View>
          <View style={tailwind('flex items-center justify-center')}>
            <AppText style={[tailwind('text-2xl text-center'), { color: getColor('text-gray-100') }]} medium>
              {strings.screens.forgot_password.confirmation.title}
            </AppText>
            <AppText style={[tailwind('text-lg text-center leading-6 mt-4'), { color: getColor('text-gray-80') }]}>
              {strings.formatString(strings.screens.forgot_password.confirmation.subtitle, email)}
            </AppText>
          </View>
          <AppButton
            style={tailwind('mt-6 w-full')}
            onPress={handleGoBackToSignIn}
            type="white"
            title={strings.buttons.goBackToSignIn}
          />
        </View>
      </AppScreen>
    );
  }
  return <></>;
}

export default ForgotPasswordScreen;
