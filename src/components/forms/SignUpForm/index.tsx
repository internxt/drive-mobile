import { Controller, useForm } from 'react-hook-form';
import React, { useEffect, useRef, useState } from 'react';
import { useTailwind } from 'tailwind-rn';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import strings from '../../../../assets/lang/strings';
import { BaseFormProps, SignUpFormData } from '../../../types/ui';
import AppTextInput from '../../AppTextInput';
import { useAppDispatch } from '../../../store/hooks';
import { authThunks } from '../../../store/slices/auth';
import analytics, { AnalyticsEventKey } from '../../../services/AnalyticsService';
import errorService from '../../../services/ErrorService';
import { Linking, TextInput, TouchableWithoutFeedback, useWindowDimensions, View } from 'react-native';
import authService from '../../../services/AuthService';
import { DevicePlatform } from '../../../types';
import { Eye, EyeSlash, Info, WarningCircle } from 'phosphor-react-native';
import useGetColor from '../../../hooks/useColor';
import validationService from '../../../services/ValidationService';
import AppText from '../../AppText';
import { auth } from '@internxt/lib';

import appService from '@internxt-mobile/services/AppService';
import StrengthMeter from 'src/components/StrengthMeter';
import { INCREASED_TOUCH_AREA } from 'src/styles/global';

const schema: yup.ObjectSchema<SignUpFormData> = yup
  .object()
  .shape({
    email: yup
      .string()
      .required(strings.errors.requiredField)
      .test({
        name: 'validEmail',
        message: strings.errors.validEmail,
        test: function (value) {
          return validationService.validateEmail(value || '');
        },
      }),
    password: yup.string().required(strings.errors.requiredField),
  })
  .required();

const CreateAccountError = {
  EmailAlreadyInUse: strings.errors.emailAlreadyInUse,
};
type PasswordStrengthLevel = 'NOT_LONG_ENOUGH' | 'NOT_COMPLEX_ENOUGH' | 'MEDIUM' | 'HARD' | undefined;
const SignUpForm = (props: BaseFormProps) => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const dispatch = useAppDispatch();
  const passwordInputRef = useRef<TextInput>(null);
  const { width: windowWidth } = useWindowDimensions();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [createAccountError, setCreateAccountError] = useState<string | undefined>(undefined);
  const [passwordStrengthLevel, setPasswordStrengthLevel] = useState<PasswordStrengthLevel>();
  const [twoFactorCode] = useState('');
  const [recaptchaToken] = useState('');
  const {
    control,
    handleSubmit,
    formState: { isValid, isDirty, errors },
    getValues,
    watch,
  } = useForm<SignUpFormData>({
    mode: 'all',
    resolver: yupResolver(schema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    if (isSubmitted) {
      setIsSubmitted(false);
    }
    validatePasswordStrength();
  }, [watch().email, watch().password]);

  const validatePasswordStrength = () => {
    const { email, password } = getValues();

    const result = auth.testPasswordStrength(password, email);
    if ('reason' in result) {
      setPasswordStrengthLevel(result.reason);
    }

    if ('strength' in result) {
      setPasswordStrengthLevel(result.strength.toUpperCase() as PasswordStrengthLevel);
    }
  };
  const getEmailError = (): ['error' | 'success' | 'warning' | 'idle', JSX.Element] => {
    if ((errors?.email?.message || createAccountError) && isSubmitted) {
      return [
        'error' as 'error' | 'success' | 'warning' | 'idle',
        <View style={tailwind('flex flex-row items-center mt-0.5')}>
          <WarningCircle weight="fill" color={tailwind('text-red').color as string} size={13} />
          <AppText style={tailwind('text-sm text-red ml-1')}>{errors?.email?.message || createAccountError}</AppText>
        </View>,
      ];
    }

    return ['idle', <></>];
  };

  const getPasswordStrengthMessage = () => {
    if (passwordStrengthLevel === 'MEDIUM') {
      return strings.messages.passwordMediumStrength;
    }
    if (passwordStrengthLevel === 'HARD') {
      return strings.messages.passwordHardStrength;
    }

    if (passwordStrengthLevel === 'NOT_LONG_ENOUGH') {
      return strings.errors.passwordLength;
    }
    if (passwordStrengthLevel === 'NOT_COMPLEX_ENOUGH') {
      return strings.errors.passwordComplex;
    }
    return '';
  };
  const renderPasswordStrengthMeter = () => {
    const emailError = control.getFieldState('email').error;
    if (!emailError && isSubmitted && !getValues().password) {
      return (
        <View style={tailwind('flex flex-row items-center mt-0.5')}>
          <WarningCircle weight="fill" color={tailwind('text-red').color as string} size={13} />
          <AppText style={tailwind('text-sm text-red ml-1')}>{strings.errors.requiredField}</AppText>
        </View>
      );
    }
    if (!getValues().password) return;
    let strength = 1;

    if (passwordStrengthLevel === 'MEDIUM') {
      strength = 2;
    }
    if (passwordStrengthLevel === 'HARD') {
      strength = 3;
    }

    return (
      <View style={tailwind('mt-2')}>
        <StrengthMeter maxValue={3} value={strength} message={getPasswordStrengthMessage()} />
      </View>
    );
  };

  const getPasswordStatus = () => {
    const emailError = control.getFieldState('email').error;
    const passwordError = control.getFieldState('password').error;
    if (!emailError && passwordError && isSubmitted) {
      return 'error';
    }
    if (passwordStrengthLevel === 'HARD') return 'success';
    if (passwordStrengthLevel === 'MEDIUM') return 'warning';
    if (getValues().password) return 'error';
    return 'idle';
  };
  const toggleShowNewPassword = () => setShowPassword(!showPassword);

  const onSubmitButtonPressed = () => {
    setIsSubmitted(true);
    if (getValues().password && passwordStrengthLevel !== 'HARD' && passwordStrengthLevel !== 'MEDIUM') return;
    handleSubmit(async (data) => {
      setCreateAccountError(undefined);
      setIsLoading(true);

      try {
        const userData = await authService.doRegister({
          firstName: authService.defaultName,
          lastName: authService.defaultLastname,
          email: data.email,
          password: data.password,
          captcha: recaptchaToken,
        });

        await Promise.all([
          analytics.identify(userData.uuid, { email: data.email }),
          analytics.track(AnalyticsEventKey.UserSignUp, {
            properties: {
              userId: userData.uuid,
              email: data.email,
              platform: DevicePlatform.Mobile,
            },
          }),
        ]);

        const userLoginData = await authService.doLogin(data.email, data.password, twoFactorCode);

        await dispatch(
          authThunks.signInThunk({
            user: userLoginData.user,
            newToken: userLoginData.newToken,
            token: userLoginData.token,
          }),
        )
          .unwrap()
          .then(() => props.onFormSubmitSuccess?.());
      } catch (err) {
        const castedError = errorService.castError(err);
        if (authService.isEmailAlreadyInUseError(castedError)) {
          setCreateAccountError(CreateAccountError.EmailAlreadyInUse);
        } else {
          setCreateAccountError(strings.errors.generic.title);
        }

        analytics.track(AnalyticsEventKey.UserSignUpFailed, {
          email: data.email,
          message: castedError.message,
        });
        setIsLoading(false);
      }
    })();
  };
  const handleTermsAndConditionsPress = () => {
    Linking.openURL(appService.urls.termsAndConditions);
  };
  useEffect(() => {
    props.onFormLoadingChange?.(isLoading);
  }, [isLoading]);

  return (
    <>
      <Controller
        name="email"
        control={control}
        render={({ field }) => (
          <AppTextInput
            wrapperStyle={tailwind('py-0')}
            testID="email-input"
            onChangeText={(text) => {
              field.onChange(text);
            }}
            status={getEmailError()}
            onSubmitEditing={() => passwordInputRef.current?.focus()}
            value={field.value}
            style={tailwind('h-11')}
            containerStyle={tailwind('mb-3')}
            placeholder={strings.inputs.email}
            maxLength={64}
            returnKeyType="next"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect={false}
            textContentType={'username'}
          />
        )}
      />

      <Controller
        name="password"
        control={control}
        render={({ field }) => (
          <AppTextInput
            inputRef={passwordInputRef}
            wrapperStyle={tailwind('py-0')}
            testID="password-input"
            onChangeText={field.onChange}
            value={field.value}
            style={tailwind('h-11')}
            containerStyle={tailwind('mb-3')}
            placeholder={strings.inputs.password}
            status={[getPasswordStatus(), renderPasswordStrengthMeter()]}
            textContentType="password"
            autoCapitalize="none"
            autoComplete="password"
            autoCorrect={false}
            onSubmitEditing={onSubmitButtonPressed}
            secureTextEntry={!showPassword}
            renderAppend={() => (
              <TouchableWithoutFeedback onPress={toggleShowNewPassword}>
                <View>
                  {showPassword ? (
                    <EyeSlash size={24} color={getColor('text-gray-80')} />
                  ) : (
                    <Eye size={24} color={getColor('text-gray-80')} />
                  )}
                </View>
              </TouchableWithoutFeedback>
            )}
          />
        )}
      />
      <PasswordForgetReminder />
      {props.renderActionsContainer({ onSubmitButtonPressed, isLoading, isValid, isDirty })}
      <View style={tailwind('mt-2.5 flex flex-row items-center justify-center flex-wrap')}>
        <TouchableWithoutFeedback hitSlop={INCREASED_TOUCH_AREA} onPress={handleTermsAndConditionsPress}>
          <View style={[tailwind('flex flex-row items-center justify-center'), { width: windowWidth - 48 }]}>
            <AppText style={tailwind('text-center')}>
              <AppText style={tailwind('text-xs text-gray-60 text-center')}>
                {strings.messages.termsAndConditions[0]}{' '}
              </AppText>
              <AppText style={tailwind('text-xs text-gray-60 text-center underline')}>
                {strings.messages.termsAndConditions[1]}
              </AppText>
            </AppText>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </>
  );
};

const PasswordForgetReminder = () => {
  const tailwind = useTailwind();
  return (
    <View style={[tailwind('p-3 flex-row rounded-lg'), { backgroundColor: 'rgba(0, 102, 255, 0.08)' }]}>
      <Info size={16} style={tailwind('mt-0.5')} weight="bold" color={tailwind('text-primary').color as string} />
      <AppText
        style={[
          tailwind('text-xs text-gray-80 pl-2 flex-1'),
          { lineHeight: (tailwind('text-xs').fontSize as number) * 1.2 },
        ]}
      >
        {strings.screens.SignUpScreen.security_subtitle[0]}
        <AppText
          medium
          style={[
            tailwind('text-xs text-gray-80 pl-2 flex-1'),
            { lineHeight: (tailwind('text-xs').fontSize as number) * 1.2 },
          ]}
        >
          {' '}
          {strings.screens.SignUpScreen.security_subtitle[1]}
        </AppText>{' '}
        {strings.screens.SignUpScreen.security_subtitle[2]}
      </AppText>
    </View>
  );
};

export default SignUpForm;
