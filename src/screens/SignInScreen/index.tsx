import React from 'react';
import { useState } from 'react';
import { View, Text, Alert, TextInput, TouchableWithoutFeedback } from 'react-native';
import { Eye, EyeSlash } from 'phosphor-react-native';

import strings from '../../../assets/lang/strings';
import analytics, { AnalyticsEventKey } from '../../services/analytics';
import InternxtLogo from '../../../assets/logo.svg';
import { getColor, tailwind } from '../../helpers/designSystem';
import AppVersionWidget from '../../components/AppVersionWidget';
import authService from '../../services/auth';
import validationService from '../../services/validation';
import { RootStackScreenProps } from '../../types';
import { useAppDispatch } from '../../store/hooks';
import { authThunks } from '../../store/slices/auth';
import errorService from '../../services/error';
import AppScreen from '../../components/AppScreen';
import AppButton from '../../components/AppButton';

function SignInScreen({ navigation }: RootStackScreenProps<'SignIn'>): JSX.Element {
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [passwordFocus, setPasswordFocus] = useState(false);
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

        setIsLoading(false);
        navigation.replace('TabExplorer');
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

  return (
    <AppScreen safeAreaTop safeAreaBottom style={tailwind('px-5 h-full justify-between')}>
      <View></View>

      <View style={[isLoading ? tailwind('opacity-50') : tailwind('opacity-100')]}>
        <View>
          <View style={tailwind('items-center pb-10')}>
            <InternxtLogo />
          </View>
        </View>

        <View style={showTwoFactor ? tailwind('hidden') : tailwind('flex')}>
          <View style={tailwind('input-wrapper my-2 items-stretch')}>
            <TextInput
              style={tailwind('input pl-4')}
              value={email}
              onChangeText={(value) => setEmail(value)}
              placeholder={strings.components.inputs.email}
              placeholderTextColor={getColor('neutral-100')}
              maxLength={64}
              keyboardType="email-address"
              autoCapitalize={'none'}
              autoCorrect={false}
              autoCompleteType="username"
              textContentType="emailAddress"
              editable={!isLoading}
            />
          </View>

          <View style={tailwind('input-wrapper my-2 items-stretch')}>
            <TextInput
              style={tailwind('input pl-4')}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setPasswordFocus(true)}
              onBlur={() => setPasswordFocus(false)}
              placeholder={strings.components.inputs.password}
              placeholderTextColor={getColor('neutral-100')}
              secureTextEntry={!showPasswordText}
              autoCompleteType="password"
              autoCapitalize="none"
              textContentType="password"
              editable={!isLoading}
            />

            {(!!password || passwordFocus) && (
              <TouchableWithoutFeedback onPress={() => setShowPasswordText(!showPasswordText)}>
                <View style={tailwind('justify-center p-3')}>
                  {showPasswordText ? (
                    <EyeSlash color={getColor('neutral-80')} />
                  ) : (
                    <Eye color={getColor('neutral-80')} />
                  )}
                </View>
              </TouchableWithoutFeedback>
            )}
          </View>
        </View>

        <View style={showTwoFactor ? tailwind('') : tailwind('hidden')}>
          <View
            style={[
              tailwind('input-wrapper my-2 items-stretch'),
              validationService.validate2FA(twoFactorCode) ? {} : tailwind('border-red-50'),
            ]}
          >
            <TextInput
              style={tailwind('input pl-4')}
              value={twoFactorCode}
              onChangeText={(value) => setTwoFactorCode(value)}
              placeholder="Two-factor code"
              placeholderTextColor={getColor('neutral-100')}
              maxLength={64}
              keyboardType="numeric"
              textContentType="none"
            />
          </View>
        </View>

        <View style={tailwind('items-center')}>
          <AppButton
            style={tailwind('py-4 my-5 w-full')}
            type="accept"
            onPress={onSignInButtonPressed}
            disabled={isSubmitButtonDisabled}
            title={isLoading ? strings.components.buttons.descrypting : strings.components.buttons.sign_in}
          />

          <TouchableWithoutFeedback onPress={() => navigation.navigate('ForgotPassword')}>
            <View style={tailwind('w-64 text-sm py-2')}>
              <Text style={tailwind('text-center text-blue-60')}>{strings.screens.SignInScreen.forgot}</Text>
            </View>
          </TouchableWithoutFeedback>

          <Text style={tailwind('text-center mt-2')} onPress={() => navigation.navigate('SignUp')}>
            <Text style={tailwind('text-sm')}>{strings.screens.SignInScreen.no_register} </Text>
            <Text style={tailwind('text-sm text-blue-60')}>{strings.screens.SignInScreen.register}</Text>
          </Text>
        </View>
      </View>

      <AppVersionWidget style={tailwind('mb-5')} />
    </AppScreen>
  );
}

export default SignInScreen;
