import { Controller, useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { useTailwind } from 'tailwind-rn';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import strings from '../../../../assets/lang/strings';
import { BaseFormProps, AuthenticationFormData } from '../../../types/ui';
import AppTextInput from '../../AppTextInput';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import authService from 'src/services/AuthService';
import { TouchableWithoutFeedback, View } from 'react-native';
import { Eye, EyeSlash } from 'phosphor-react-native';
import useGetColor from 'src/hooks/useColor';
import { authActions } from 'src/store/slices/auth';

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
  const { user } = useAppSelector((state) => state.auth);
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
      setIsLoading(true);
      const areCredentialsCorrect = await authService.areCredentialsCorrect({
        email: user?.email || '',
        password: data.password,
      });

      console.log('areCredentialsCorrect: ', areCredentialsCorrect);

      if (areCredentialsCorrect) {
        dispatch(authActions.setSessionPassword(data.password));
        props.onFormSubmitSuccess?.();
      } else {
        setError('password', { message: strings.errors.wrongPassword });
      }
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
