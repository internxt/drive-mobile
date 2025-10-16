import { yupResolver } from '@hookform/resolvers/yup';
import { Eye, EyeSlash } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { TouchableWithoutFeedback, View } from 'react-native';
import useGetColor from 'src/hooks/useColor';
import authService from 'src/services/AuthService';
import { useTailwind } from 'tailwind-rn';
import * as yup from 'yup';
import strings from '../../../../assets/lang/strings';
import { useAppDispatch } from '../../../store/hooks';
import { AuthenticationFormData, BaseFormProps } from '../../../types/ui';
import AppTextInput from '../../AppTextInput';

const schema: yup.SchemaOf<AuthenticationFormData> = yup
  .object()
  .shape({
    password: yup.string().required(strings.errors.requiredField),
  })
  .required();

const AuthenticationForm = (props: BaseFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const dispatch = useAppDispatch();
  const {
    control,
    handleSubmit,
    formState: { isValid, isDirty },
    setError,
  } = useForm<AuthenticationFormData>({
    resolver: yupResolver(schema),
    mode: 'onChange',
    defaultValues: {
      password: '',
    },
  });
  const onSubmitButtonPressed = handleSubmit(async (data) => {
    try {
      const { credentials } = await authService.getAuthCredentials();
      setIsLoading(true);
      if (!credentials) return;
      // const areCredentialsCorrect = await authService.areCredentialsCorrect({
      //   email: credentials.user.email || '',
      //   password: data.password,
      // });

      // if (areCredentialsCorrect) {
      // dispatch(authActions.setSessionPassword(data.password));
      props.onFormSubmitSuccess?.();
      // } else {
      // setError('password', { message: strings.errors.wrongPassword });
      // }
    } catch (err) {
      setError('password', { message: strings.errors.wrongPassword });
    } finally {
      setIsLoading(false);
    }
  });
  const toggleShowPassword = () => setShowPassword(!showPassword);

  useEffect(() => {
    props.onFormLoadingChange?.(isLoading);
  }, [isLoading]);

  return (
    <>
      <Controller
        name="password"
        control={control}
        render={({ field, fieldState }) => (
          <AppTextInput
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            value={field.value}
            status={[fieldState.error ? 'error' : 'idle', fieldState.error?.message || '']}
            containerStyle={tailwind('mb-6')}
            label={strings.inputs.password}
            secureTextEntry={!showPassword}
            autoFocus
            renderAppend={({ isFocused }) =>
              isFocused ? (
                <TouchableWithoutFeedback onPress={toggleShowPassword}>
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

      {props.renderActionsContainer({ onSubmitButtonPressed, isLoading, isValid, isDirty })}
    </>
  );
};

export default AuthenticationForm;
