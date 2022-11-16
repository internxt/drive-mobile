import { View, Text, Alert, TouchableHighlight, TouchableWithoutFeedback } from 'react-native';
import React, { useEffect, useState } from 'react';

import strings from '../../../assets/lang/strings';
import validationService from '../../services/ValidationService';
import authService from '../../services/AuthService';
import AppScreen from '../../components/AppScreen';
import { RootStackScreenProps } from '../../types/navigation';
import { useTailwind } from 'tailwind-rn';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import AppTextInput from '../../components/AppTextInput';
import errorService from '@internxt-mobile/services/ErrorService';
import { EnvelopeSimple, WarningCircle } from 'phosphor-react-native';

function ForgotPasswordScreen({ navigation }: RootStackScreenProps<'ForgotPassword'>): JSX.Element {
  const tailwind = useTailwind();
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
        <WarningCircle weight="fill" color={tailwind('text-red-').color as string} size={13} />
        <AppText style={tailwind('text-sm text-red- ml-1 leading-4')}>{emailError}</AppText>
      </View>
    );
  };

  if (currentContainer === 1) {
    return (
      <AppScreen safeAreaTop style={tailwind('h-full px-6')}>
        <View style={tailwind('h-12')} />
        <View style={tailwind('mb-4')}>
          <AppText medium style={tailwind('text-2xl text-gray-100')}>
            {strings.screens.forgot_password.title}
          </AppText>
        </View>
        <View style={tailwind('')}>
          <View>
            <View>
              <View style={tailwind('bg-gray-1 p-4 border border-gray-10 rounded-xl mb-4')}>
                <AppText style={tailwind('text-sm')}>{strings.screens.forgot_password.message}</AppText>
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
                backgroundColor: '#ebf2ff',
                borderColor: '#f6faff',
                borderWidth: 16,
              },
            ]}
          >
            <EnvelopeSimple size={46} weight="light" color={tailwind('text-primary').color as string} />
          </View>
          <View style={tailwind('flex items-center justify-center')}>
            <AppText style={tailwind('text-2xl text-center')} medium>
              {strings.screens.forgot_password.confirmation.title}
            </AppText>
            <AppText style={tailwind('text-lg text-center text-gray-80 leading-6 mt-4')}>
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
