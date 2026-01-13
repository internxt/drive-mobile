import { Eye, EyeSlash, WarningCircle } from 'phosphor-react-native';
import { useEffect, useRef, useState } from 'react';
import { Animated, TextInput, View } from 'react-native';

import { useKeyboard } from '@internxt-mobile/hooks/useKeyboard';
import validationService from '@internxt-mobile/services/ValidationService';
import { ScrollView, TouchableWithoutFeedback } from 'react-native-gesture-handler';
import AppText from 'src/components/AppText';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../assets/lang/strings';
import AppButton from '../../components/AppButton';
import AppScreen from '../../components/AppScreen';
import AppTextInput from '../../components/AppTextInput';
import AppVersionWidget from '../../components/AppVersionWidget';
import useGetColor from '../../hooks/useColor';
import analytics, { AnalyticsEventKey } from '../../services/AnalyticsService';
import authService from '../../services/AuthService';
import errorService from '../../services/ErrorService';
import { useAppDispatch } from '../../store/hooks';
import { authThunks } from '../../store/slices/auth';
import { RootStackScreenProps } from '../../types/navigation';

const MAX_ERROR_MESSAGE_LENGTH = 200;

function SignInScreen({ navigation }: RootStackScreenProps<'SignIn'>): JSX.Element {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  const dispatch = useAppDispatch();
  const { keyboardShown } = useKeyboard();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [showPasswordText, setShowPasswordText] = useState(false);
  const animatedHeight = useRef(new Animated.Value(0));
  const passwordInputRef = useRef<TextInput>(null);
  const [failed2FA, setFailed2FA] = useState(false);

  useEffect(() => {
    if (!twoFactorCode.length) {
      setFailed2FA(false);
    }
  }, [twoFactorCode]);

  useEffect(() => {
    if (showTwoFactor) {
      Animated.timing(animatedHeight.current, {
        duration: 150,
        toValue: 66,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(animatedHeight.current, {
        duration: 150,
        toValue: 0,
        useNativeDriver: false,
      }).start();
    }
  }, [showTwoFactor]);

  useEffect(() => {
    setIsSubmitted(false);
    setErrors({});
  }, [email, password]);

  const focusPassword = () => {
    passwordInputRef.current?.focus();
  };

  const onSignInButtonPressed = async () => {
    setIsSubmitted(true);
    if (!email || !password) {
      setErrors({ email: strings.errors.missingAuthCredentials });
      return;
    }

    setIsLoading(true);
    if (!validationService.validateEmail(email)) {
      setErrors({ email: strings.errors.validEmail });
      return;
    }

    setFailed2FA(false);
    let requires2FA = false;

    try {
      setErrors({});
      requires2FA = await authService.is2FAEnabled(email);

      if (requires2FA && !twoFactorCode) {
        setShowTwoFactor(true);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      const result = await authService.doLogin(email.toLowerCase(), password, twoFactorCode);
      await dispatch(
        authThunks.signInThunk({ user: result.user, token: result.token, newToken: result.newToken }),
      ).unwrap();

      analytics.identify(result.user.uuid, { email: result.user.email });
      analytics.track(AnalyticsEventKey.UserSignIn, {
        email,
      });
      setTimeout(() => {
        setIsLoading(false);
        navigation.replace('TabExplorer', { screen: 'Home' });
      }, 1000);
    } catch (err) {
      if (requires2FA) {
        setFailed2FA(true);
      }
      let errorMessage;
      try {
        const castedError = errorService.castError(err);
        errorMessage = castedError.message;

        if (errorMessage.length > MAX_ERROR_MESSAGE_LENGTH) errorMessage = strings.errors.genericError;
      } catch (castingError) {
        errorMessage = strings.errors.genericError;
      }

      analytics.track(AnalyticsEventKey.UserSignInFailed, {
        email,
        message: errorMessage,
      });

      setIsLoading(false);
      setErrors({ loginFailed: errorMessage });
    }
  };

  const onGoToSignUpButtonPressed = () => {
    setErrors({});
    navigation.navigate('SignUp');
  };

  const renderErrorMessage = () => {
    if (errors['loginFailed'] || errors['email'] || (errors['password'] && isSubmitted)) {
      const errorMessage = failed2FA
        ? strings.errors.failed2FA
        : errors['email'] || errors['password'] || errors['loginFailed'];
      return (
        <View style={tailwind('flex flex-row items-center mt-0.5')}>
          <WarningCircle weight="fill" color={getColor('text-red')} size={13} />
          <AppText style={[tailwind('text-sm ml-1'), { color: getColor('text-red') }]}>{errorMessage}</AppText>
        </View>
      );
    }
  };

  const hasErrors = (errors['loginFailed'] || errors['email'] || errors['password']) && isSubmitted;

  return (
    <AppScreen
      safeAreaTop
      safeAreaBottom
      style={[tailwind('h-full px-6'), { backgroundColor: getColor('bg-surface') }]}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[tailwind('h-full px-6'), { backgroundColor: getColor('bg-surface') }]}
      >
        <View style={tailwind('h-12')} />

        <View>
          <View style={tailwind('mb-5')}>
            <AppText medium style={[tailwind('text-2xl'), { color: getColor('text-gray-100') }]}>
              {strings.screens.SignInScreen.title}
            </AppText>
          </View>

          <View>
            <AppTextInput
              wrapperStyle={tailwind('py-0')}
              status={hasErrors ? ['error', ''] : undefined}
              testID="email-input"
              style={tailwind('h-11')}
              value={email}
              onChangeText={(value) => setEmail(value)}
              placeholder={strings.inputs.email}
              maxLength={64}
              keyboardType="email-address"
              autoCapitalize={'none'}
              returnKeyType="next"
              autoCorrect={false}
              autoComplete="username"
              textContentType="emailAddress"
              editable={!isLoading}
              onSubmitEditing={focusPassword}
            />

            <AppTextInput
              inputRef={passwordInputRef}
              wrapperStyle={tailwind('py-0')}
              testID="password-input"
              containerStyle={tailwind('my-2.5')}
              style={tailwind('h-11 py-0')}
              value={password}
              status={hasErrors ? ['error', showTwoFactor ? undefined : renderErrorMessage()] : undefined}
              onChangeText={setPassword}
              placeholder={strings.inputs.password}
              secureTextEntry={!showPasswordText}
              autoComplete="password"
              autoCapitalize="none"
              textContentType="password"
              editable={!isLoading}
              onSubmitEditing={onSignInButtonPressed}
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

          <Animated.View style={[{ height: animatedHeight.current }, tailwind('overflow-hidden')]}>
            <AppTextInput
              wrapperStyle={tailwind('py-0')}
              style={tailwind('h-11 py-0')}
              placeholder={strings.inputs.twoFactorAuth}
              keyboardType="decimal-pad"
              status={failed2FA ? ['error', renderErrorMessage()] : undefined}
              onChangeText={setTwoFactorCode}
              disableCustomAndroidCursor
            />
          </Animated.View>

          <View style={tailwind('items-center')}>
            <AppButton
              testID="sign-in-button"
              style={tailwind('mb-5 w-full py-0 h-11')}
              type="accept"
              onPress={onSignInButtonPressed}
              loading={isLoading}
              title={strings.buttons.sign_in}
            />

            <TouchableWithoutFeedback onPress={() => navigation.navigate('ForgotPassword')}>
              <View style={tailwind('w-64 text-sm')}>
                <AppText medium style={[tailwind('text-center'), { color: getColor('text-primary') }]}>
                  {strings.screens.SignInScreen.forgot}
                </AppText>
              </View>
            </TouchableWithoutFeedback>

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
                tailwind('text-sm mb-4'),
                {
                  backgroundColor: 'transparent',
                  color: getColor('text-gray-80'),
                },
              ]}
            >
              {strings.screens.SignInScreen.no_register}{' '}
            </AppText>

            <AppButton
              style={tailwind('w-full py-0 h-11')}
              type="white"
              onPress={onGoToSignUpButtonPressed}
              title={strings.buttons.createAccount}
            />
          </View>
        </View>
        {keyboardShown ? null : <AppVersionWidget displayLogo style={tailwind('mb-5 mt-auto')} />}
      </ScrollView>
    </AppScreen>
  );
}

export default SignInScreen;
