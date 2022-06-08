import React, { useState } from 'react';
import { TextInput, TouchableHighlight, View, Text, Alert, ScrollView, TouchableWithoutFeedback } from 'react-native';

import AppCheckBox from '../../components/AppCheckBox';
import strings from '../../../assets/lang/strings';
import InternxtLogo from '../../../assets/logo.svg';
import analytics, { AnalyticsEventKey } from '../../services/AnalyticsService';
import validationService from '../../services/ValidationService';
import authService from '../../services/AuthService';
import { useAppDispatch } from '../../store/hooks';
import errorService from '../../services/ErrorService';
import { DevicePlatform } from '../../types';
import { authThunks } from '../../store/slices/auth';
import AppScreen from '../../components/AppScreen';
import { Eye, EyeSlash } from 'phosphor-react-native';
import AppText from '../../components/AppText';
import { RootStackScreenProps } from '../../types/navigation';
import { useTailwind } from 'tailwind-rn';

function SignUpScreen({ navigation }: RootStackScreenProps<'SignUp'>): JSX.Element {
  const tailwind = useTailwind();
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const twoFactorCode = '';
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptPolicy, setAcceptPolicy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordFocus, setPasswordFocus] = useState(false);
  const [confirmPasswordFocus, setConfirmPasswordFocus] = useState(false);
  const [recaptchaToken] = useState<string>('');
  const isEmptyEmail = validationService.isNullOrEmpty(email);
  const isValidEmail = validationService.validateEmail(email);
  const isValidFirstName = !validationService.isNullOrEmpty(firstName);
  const isValidLastName = !validationService.isNullOrEmpty(lastName);
  const isEmptyPassword = validationService.isNullOrEmpty(password);
  const isConfirmPasswordEmpty = validationService.isNullOrEmpty(confirmPassword);
  const isValidPassword = validationService.isStrongPassword(password);
  const isValidConfirmedPassword = confirmPassword && password === confirmPassword;

  const isValidForm =
    isValidEmail && isValidFirstName && isValidLastName && isValidPassword && isValidConfirmedPassword && acceptPolicy;

  const [registerButtonClicked, setRegisterButtonClicked] = useState(false);

  const onSignUpButtonPressed = async () => {
    if (!isValidPassword) {
      return Alert.alert('', 'Please make sure your password contains at least six characters, a number, and a letter');
    }
    if (password !== confirmPassword) {
      return Alert.alert('', 'Please make sure your passwords match');
    }
    if (registerButtonClicked || isLoading) {
      return;
    }

    setRegisterButtonClicked(true);
    setIsLoading(true);

    try {
      const userData = await authService.doRegister({
        firstName: firstName,
        lastName: lastName,
        email: email,
        password: password,
        captcha: recaptchaToken,
      });

      await Promise.all([
        analytics.identify(userData.uuid, { email: email }),
        analytics.track(AnalyticsEventKey.UserSignUp, {
          properties: {
            userId: userData.uuid,
            email: email,
            platform: DevicePlatform.Mobile,
          },
        }),
      ]);

      const userLoginData = await authService.apiLogin(email);

      await dispatch(authThunks.signInThunk({ email, password, sKey: userLoginData.sKey, twoFactorCode }))
        .unwrap()
        .then(() => {
          navigation.replace('TabExplorer', { screen: 'Home', showReferralsBanner: true });
        });
    } catch (err) {
      const castedError = errorService.castError(err);

      await analytics.track(AnalyticsEventKey.UserSignInAttempted, {
        status: 'error',
        message: castedError.message,
      });
      setIsLoading(false);
      setRegisterButtonClicked(false);

      Alert.alert('Error while registering', castedError.message);
    }
  };
  const onGoToSignInButtonPressed = () => navigation.replace('SignIn');

  return (
    <AppScreen safeAreaBottom safeAreaTop>
      <ScrollView style={tailwind('px-6')}>
        <View>
          <View style={tailwind('pb-6')}>
            <View style={tailwind('items-center mt-2')}>
              <InternxtLogo width={120} height={40} />
            </View>
            <View>
              <Text style={tailwind('text-sm text-center')}>{strings.screens.SignUpScreen.create_account_title}</Text>
            </View>
          </View>

          <View>
            <View
              style={[tailwind('input-wrapper my-2 items-stretch'), isValidFirstName ? tailwind('input-valid') : {}]}
            >
              <TextInput
                testID="first-name-input"
                style={tailwind('input pl-4')}
                value={firstName}
                onChangeText={(value) => setFirstName(value)}
                placeholder={strings.components.inputs.first_name}
                placeholderTextColor="#666"
                maxLength={64}
                autoCapitalize="words"
                autoCompleteType="off"
                key="name"
                autoCorrect={false}
              />
            </View>

            <View
              style={[tailwind('input-wrapper my-2 items-stretch'), isValidLastName ? tailwind('input-valid') : {}]}
            >
              <TextInput
                testID="last-name-input"
                style={tailwind('input pl-4')}
                value={lastName}
                onChangeText={(value) => setLastName(value)}
                placeholder={strings.components.inputs.last_name}
                placeholderTextColor="#666"
                maxLength={64}
                autoCapitalize="words"
                autoCompleteType="off"
                key="lastname"
                autoCorrect={false}
              />
            </View>

            <View
              style={[
                tailwind('input-wrapper my-2 items-stretch'),
                isEmptyEmail ? {} : tailwind(isValidEmail ? 'input-valid' : 'input-error'),
              ]}
            >
              <TextInput
                testID="email-input"
                style={tailwind('input pl-4')}
                value={email}
                onChangeText={(value) => setEmail(value)}
                placeholder={strings.components.inputs.email}
                placeholderTextColor="#666"
                maxLength={64}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCompleteType="off"
                autoCorrect={false}
                key="mailaddress"
                textContentType="emailAddress"
              />
            </View>
          </View>

          <View>
            <View
              style={[
                tailwind('input-wrapper my-2 items-stretch'),
                isEmptyPassword ? {} : tailwind(isValidPassword ? 'input-valid' : 'input-error'),
              ]}
            >
              <TextInput
                testID="password-input"
                style={tailwind('input pl-4')}
                value={password}
                onChangeText={setPassword}
                placeholder={strings.components.inputs.password}
                placeholderTextColor="#666"
                textContentType="password"
                autoCapitalize="none"
                autoCompleteType="password"
                autoCorrect={false}
                secureTextEntry={!showPassword}
                key="password"
                onFocus={() => setPasswordFocus(true)}
                onBlur={() => setPasswordFocus(false)}
              />

              {(!isEmptyPassword || passwordFocus) && (
                <TouchableWithoutFeedback onPress={() => setShowPassword(!showPassword)}>
                  <View style={tailwind('justify-center p-3')}>
                    {showPassword ? (
                      <EyeSlash color={tailwind('text-neutral-80').color as string} />
                    ) : (
                      <Eye color={tailwind('text-neutral-80').color as string} />
                    )}
                  </View>
                </TouchableWithoutFeedback>
              )}
            </View>

            <View
              style={[
                tailwind('input-wrapper my-2 items-stretch'),
                !isConfirmPasswordEmpty && tailwind(isValidConfirmedPassword ? 'input-valid' : 'input-error'),
              ]}
            >
              <TextInput
                testID="confirm-password-input"
                style={tailwind('input pl-4')}
                value={confirmPassword}
                onChangeText={(value) => setConfirmPassword(value)}
                placeholder={strings.components.inputs.confirm_password}
                placeholderTextColor="#666"
                secureTextEntry={!showConfirmPassword}
                textContentType="password"
                key="confirmPassword"
                onFocus={() => setConfirmPasswordFocus(true)}
                onBlur={() => setConfirmPasswordFocus(false)}
              />

              {(!isConfirmPasswordEmpty || confirmPasswordFocus) && (
                <TouchableWithoutFeedback onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <View style={tailwind('justify-center p-3')}>
                    {showConfirmPassword ? (
                      <EyeSlash color={tailwind('text-neutral-80').color as string} />
                    ) : (
                      <Eye color={tailwind('text-neutral-80').color as string} />
                    )}
                  </View>
                </TouchableWithoutFeedback>
              )}
            </View>
          </View>
        </View>

        <View style={tailwind('mt-3')}>
          <Text style={tailwind('text-xs text-gray-50')}>{strings.screens.SignUpScreen.security_subtitle}</Text>
        </View>

        <View style={tailwind('py-3')}>
          <AppCheckBox
            testID="terms-and-conditions-checkbox"
            text={strings.screens.SignUpScreen.acceptTermsAndConditions}
            value={acceptPolicy}
            onChange={setAcceptPolicy}
          ></AppCheckBox>
        </View>

        <TouchableHighlight
          testID="sign-up-button"
          disabled={!isValidForm || registerButtonClicked}
          style={[
            tailwind('btn btn-primary my-4'),
            !isValidForm || registerButtonClicked ? tailwind('opacity-50') : {},
          ]}
          underlayColor="#4585f5"
          onPress={() => onSignUpButtonPressed()}
        >
          <View>
            <Text style={tailwind('text-base btn-label')}>
              {registerButtonClicked
                ? strings.components.buttons.creating_button
                : strings.components.buttons.createAccount}
            </Text>
          </View>
        </TouchableHighlight>

        <AppText style={tailwind('text-center mb-10')} onPress={onGoToSignInButtonPressed}>
          <AppText style={tailwind('text-sm text-blue-60')}>{strings.screens.SignInScreen.title}</AppText>
        </AppText>
      </ScrollView>
    </AppScreen>
  );
}

export default SignUpScreen;
