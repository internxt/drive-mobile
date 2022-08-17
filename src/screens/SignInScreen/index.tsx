import React from 'react';
import { useState } from 'react';
import { View, Text, Alert, TextInput, TouchableWithoutFeedback } from 'react-native';
import { Eye, EyeSlash } from 'phosphor-react-native';

import strings from '../../../assets/lang/strings';
import analytics, { AnalyticsEventKey } from '../../services/AnalyticsService';
import InternxtLogo from '../../../assets/logo.svg';
import AppVersionWidget from '../../components/AppVersionWidget';
import authService from '../../services/AuthService';
import validationService from '../../services/ValidationService';
import { RootStackScreenProps } from '../../types/navigation';
import { useAppDispatch } from '../../store/hooks';
import { authThunks } from '../../store/slices/auth';
import { errorService } from '@internxt-mobile/services/common';
import AppScreen from '../../components/AppScreen';
import AppButton from '../../components/AppButton';
import { useTailwind } from 'tailwind-rn';
import AppTextInput from '../../components/AppTextInput';
import useGetColor from '../../hooks/useColor';

function SignInScreen({ navigation }: RootStackScreenProps<'SignIn'>): JSX.Element {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [showPasswordText, setShowPasswordText] = useState(false);
  const isSubmitButtonDisabled = !email || !password;
  const onSignInButtonPressed = async () => {
    setIsLoading(true);

    try {
      const userLoginData = await authService.apiLogin(email);

      if (userLoginData.tfa && !twoFactorCode) {
        setShowTwoFactor(true);
        setIsLoading(false);
      } else {
        await dispatch(authThunks.signInThunk({ email, password, sKey: userLoginData.sKey, twoFactorCode })).unwrap();

        setTimeout(() => {
          setIsLoading(false);
          navigation.replace('TabExplorer', { screen: 'Home' });
        }, 1000);
      }
    } catch (err) {
      const castedError = errorService.castError(err);

      analytics.track(AnalyticsEventKey.UserSignInAttempted, {
        status: 'error',
        message: castedError.message,
      });

      setIsLoading(false);

      Alert.alert('Could not log in', castedError.message);
    }
  };
  const onGoToSignUpButtonPressed = () => navigation.navigate('SignUp');
  const inputWrapperStyle = tailwind('flex-row border-gray-10 rounded-xl border h-14');

  return (
    <AppScreen safeAreaTop safeAreaBottom style={tailwind('px-5 h-full justify-between')}>
      <View />

      <View style={[isLoading ? tailwind('opacity-50') : tailwind('opacity-100')]}>
        <View>
          <View style={tailwind('items-center pb-10')}>
            <InternxtLogo />
          </View>
        </View>

        <View style={showTwoFactor ? tailwind('hidden') : tailwind('flex')}>
          <AppTextInput
            testID="email-input"
            style={tailwind('h-11')}
            value={email}
            onChangeText={(value) => setEmail(value)}
            placeholder={strings.inputs.email}
            maxLength={64}
            keyboardType="email-address"
            autoCapitalize={'none'}
            autoCorrect={false}
            autoCompleteType="username"
            textContentType="emailAddress"
            editable={!isLoading}
          />

          <AppTextInput
            testID="password-input"
            containerStyle={tailwind('my-2')}
            style={tailwind('h-11')}
            value={password}
            onChangeText={setPassword}
            placeholder={strings.inputs.password}
            secureTextEntry={!showPasswordText}
            autoCompleteType="password"
            autoCapitalize="none"
            textContentType="password"
            editable={!isLoading}
            renderAppend={() => (
              <TouchableWithoutFeedback onPress={() => setShowPasswordText(!showPasswordText)}>
                <View>
                  {showPasswordText ? (
                    <EyeSlash color={getColor('text-gray-80')} size={24} />
                  ) : (
                    <Eye color={getColor('text-gray-80')} size={24} />
                  )}
                </View>
              </TouchableWithoutFeedback>
            )}
          />
        </View>

        <View style={showTwoFactor ? tailwind('') : tailwind('hidden')}>
          <View
            style={[
              inputWrapperStyle,
              tailwind('my-2 items-stretch'),
              validationService.validate2FA(twoFactorCode) ? {} : tailwind('border-red-50'),
            ]}
          >
            <TextInput
              style={tailwind('flex-grow pl-4')}
              value={twoFactorCode}
              onChangeText={(value) => setTwoFactorCode(value)}
              placeholder="Two-factor code"
              placeholderTextColor={getColor('text-neutral-100')}
              maxLength={64}
              keyboardType="numeric"
              textContentType="none"
            />
          </View>
        </View>

        <View style={tailwind('items-center')}>
          <AppButton
            testID="sign-in-button"
            style={tailwind('py-4 my-5 w-full')}
            type="accept"
            onPress={onSignInButtonPressed}
            disabled={isSubmitButtonDisabled}
            title={isLoading ? strings.buttons.descrypting : strings.buttons.sign_in}
          />

          <TouchableWithoutFeedback onPress={() => navigation.navigate('ForgotPassword')}>
            <View style={tailwind('w-64 text-sm py-2')}>
              <Text style={tailwind('text-center text-blue-60')}>{strings.screens.SignInScreen.forgot}</Text>
            </View>
          </TouchableWithoutFeedback>

          <TouchableWithoutFeedback testID="go-to-sign-up-button" onPress={onGoToSignUpButtonPressed}>
            <View style={tailwind('px-4 py-2 flex-row')}>
              <Text style={tailwind('text-sm bg-transparent')}>{strings.screens.SignInScreen.no_register} </Text>
              <Text style={tailwind('text-sm text-blue-60')}>{strings.screens.SignInScreen.register}</Text>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </View>

      <AppVersionWidget style={tailwind('mb-5')} />
    </AppScreen>
  );
}

export default SignInScreen;
