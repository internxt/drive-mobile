import { Controller, useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { useTailwind } from 'tailwind-rn';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import strings from '../../../../assets/lang/strings';
import { BaseFormProps, SignUpFormData } from '../../../types/ui';
import AppTextInput from '../../AppTextInput';
import { useAppDispatch } from '../../../store/hooks';
import { authThunks } from '../../../store/slices/auth';
import analyticsService, { AnalyticsEventKey } from '../../../services/AnalyticsService';
import errorService from '../../../services/ErrorService';
import { Alert, TouchableWithoutFeedback, View } from 'react-native';
import authService from '../../../services/AuthService';
import { DevicePlatform } from '../../../types';
import AppCheckBox from '../../AppCheckBox';
import { Eye, EyeSlash } from 'phosphor-react-native';
import useGetColor from '../../../hooks/useColor';
import validationService from '../../../services/ValidationService';
import AppText from '../../AppText';
import { auth } from '@internxt/lib';

const schema: yup.SchemaOf<SignUpFormData> = yup
  .object()
  .shape({
    name: yup.string().required(strings.errors.requiredField),
    lastName: yup.string().required(strings.errors.requiredField),
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
    password: yup
      .string()
      .required(strings.errors.requiredField)
      .test({
        name: 'strongPassword',
        test: function (value) {
          return auth.testPasswordStrength(value || '', this.parent.email).valid;
        },
      }),
    confirmPassword: yup
      .string()
      .required(strings.errors.requiredField)
      .test({
        name: 'passwordsDoNotMatch',
        message: strings.errors.passwordsDontMatch,
        test: function (value) {
          return value === this.parent.password;
        },
      }),
    termsAndConditions: yup.boolean().isTrue(strings.errors.requiredField),
  })
  .required();

const SignUpForm = (props: BaseFormProps) => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [twoFactorCode] = useState('');
  const [recaptchaToken] = useState('');
  const {
    control,
    handleSubmit,
    formState: { isValid, isDirty },
  } = useForm<SignUpFormData>({
    mode: 'all',
    resolver: yupResolver(schema),
    defaultValues: {
      name: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      termsAndConditions: false,
    },
  });
  const toggleShowNewPassword = () => setShowPassword(!showPassword);
  const toggleShowConfirmPassword = () => setShowConfirmPassword(!showConfirmPassword);

  const onSubmitButtonPressed = handleSubmit(async (data) => {
    setIsLoading(true);

    try {
      const userData = await authService.doRegister({
        firstName: data.name,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        captcha: recaptchaToken,
      });

      await Promise.all([
        analyticsService.identify(userData.uuid, { email: data.email }),
        analyticsService.track(AnalyticsEventKey.UserSignUp, {
          properties: {
            userId: userData.uuid,
            email: data.email,
            platform: DevicePlatform.Mobile,
          },
        }),
      ]);

      const userLoginData = await authService.apiLogin(data.email);

      await dispatch(
        authThunks.signInThunk({ email: data.email, password: data.password, sKey: userLoginData.sKey, twoFactorCode }),
      )
        .unwrap()
        .then(() => props.onFormSubmitSuccess?.());
    } catch (err) {
      const castedError = errorService.castError(err);

      await analyticsService.track(AnalyticsEventKey.UserSignInAttempted, {
        status: 'error',
        message: castedError.message,
      });
      setIsLoading(false);

      Alert.alert('Error while registering', castedError.message);
    }
  });

  useEffect(() => {
    props.onFormLoadingChange?.(isLoading);
  }, [isLoading]);

  return (
    <>
      <Controller
        name="name"
        control={control}
        render={({ field }) => (
          <AppTextInput
            testID="first-name-input"
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            value={field.value}
            autoFocus
            style={tailwind('h-11')}
            containerStyle={tailwind('mb-3')}
            placeholder={strings.inputs.name}
            maxLength={64}
            autoCapitalize="words"
            autoCompleteType="off"
            autoCorrect={false}
          />
        )}
      />
      <Controller
        name="lastName"
        control={control}
        render={({ field }) => (
          <AppTextInput
            testID="last-name-input"
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            value={field.value}
            style={tailwind('h-11')}
            containerStyle={tailwind('mb-3')}
            placeholder={strings.inputs.lastName}
            maxLength={64}
            autoCapitalize="words"
            autoCompleteType="off"
            autoCorrect={false}
          />
        )}
      />

      <Controller
        name="email"
        control={control}
        render={({ field }) => (
          <AppTextInput
            testID="email-input"
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            value={field.value}
            style={tailwind('h-11')}
            containerStyle={tailwind('mb-3')}
            placeholder={strings.inputs.email}
            maxLength={64}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCompleteType="off"
            autoCorrect={false}
            textContentType="emailAddress"
          />
        )}
      />

      <Controller
        name="password"
        control={control}
        render={({ field }) => (
          <AppTextInput
            testID="password-input"
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            value={field.value}
            style={tailwind('h-11')}
            containerStyle={tailwind('mb-3')}
            placeholder={strings.inputs.password}
            textContentType="password"
            autoCapitalize="none"
            autoCompleteType="password"
            autoCorrect={false}
            secureTextEntry={!showPassword}
            renderAppend={({ isFocused }) =>
              isFocused ? (
                <TouchableWithoutFeedback onPress={toggleShowNewPassword}>
                  <View>
                    {showPassword ? (
                      <EyeSlash size={24} color={getColor('text-gray-80')} />
                    ) : (
                      <Eye size={24} color={getColor('text-gray-80')} />
                    )}
                  </View>
                </TouchableWithoutFeedback>
              ) : undefined
            }
          />
        )}
      />

      <Controller
        name="confirmPassword"
        control={control}
        render={({ field }) => (
          <AppTextInput
            testID="confirm-password-input"
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            value={field.value}
            style={tailwind('h-11')}
            containerStyle={tailwind('mb-3')}
            placeholder={strings.inputs.confirmPassword}
            textContentType="password"
            autoCapitalize="none"
            autoCompleteType="password"
            autoCorrect={false}
            secureTextEntry={!showConfirmPassword}
            renderAppend={({ isFocused }) =>
              isFocused ? (
                <TouchableWithoutFeedback onPress={toggleShowConfirmPassword}>
                  <View>
                    {showConfirmPassword ? (
                      <EyeSlash size={24} color={getColor('text-gray-80')} />
                    ) : (
                      <Eye size={24} color={getColor('text-gray-80')} />
                    )}
                  </View>
                </TouchableWithoutFeedback>
              ) : undefined
            }
          />
        )}
      />

      <View style={tailwind('my-3')}>
        <AppText style={tailwind('text-xs text-gray-50')}>{strings.screens.SignUpScreen.security_subtitle}</AppText>
      </View>

      <Controller
        name="termsAndConditions"
        control={control}
        render={({ field }) => (
          <AppCheckBox
            testID="terms-and-conditions-checkbox"
            style={tailwind('my-3')}
            text={strings.screens.SignUpScreen.acceptTermsAndConditions}
            value={field.value}
            onChange={field.onChange}
          ></AppCheckBox>
        )}
      />

      {props.renderActionsContainer({ onSubmitButtonPressed, isLoading, isValid, isDirty })}
    </>
  );
};

export default SignUpForm;
