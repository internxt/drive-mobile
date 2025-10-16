import { yupResolver } from '@hookform/resolvers/yup';
import { auth } from '@internxt/lib';
import { Eye, EyeSlash } from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { TouchableWithoutFeedback, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import * as yup from 'yup';
import strings from '../../../../assets/lang/strings';
import useGetColor from '../../../hooks/useColor';
import { useAppSelector } from '../../../store/hooks';
import { BaseFormProps, ChangePasswordFormData } from '../../../types/ui';
import AppTextInput from '../../AppTextInput';
import StrengthMeter from '../../StrengthMeter';

const ChangePasswordForm = (props: BaseFormProps) => {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  const [isLoading, setIsLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const { user } = useAppSelector((state) => state.auth);
  const schema: yup.SchemaOf<ChangePasswordFormData> = yup
    .object()
    .shape({
      newPassword: yup
        .string()
        .required(strings.errors.requiredField)
        .test({
          name: 'passwordStrength',
          message: '',
          test: function (value) {
            return auth.testPasswordStrength(value || '', user?.email || '').valid;
          },
        }),
      confirmNewPassword: yup
        .string()
        .required(strings.errors.requiredField)
        .test({
          name: 'passwordsDoNotMatch',
          message: strings.errors.passwordsDontMatch,
          test: function (value) {
            return value === this.parent.newPassword;
          },
        }),
    })
    .required();
  const {
    control,
    handleSubmit,
    setValue,
    formState: { isDirty, isValid },
  } = useForm<ChangePasswordFormData>({
    resolver: yupResolver(schema),
    mode: 'all',
    defaultValues: {
      newPassword: '',
      confirmNewPassword: '',
    },
  });
  const { newPassword } = useWatch({ control });
  const { newPasswordStatusMessage, strength } = useMemo(() => {
    const passwordStrengthResult = auth.testPasswordStrength(newPassword || '', user?.email || '');
    const strength = passwordStrengthResult.valid ? (passwordStrengthResult.strength === 'medium' ? 2 : 3) : 1;
    const reasonMessages = {
      ['NOT_LONG_ENOUGH']: strings.errors.passwordLength,
      ['NOT_COMPLEX_ENOUGH']: strings.errors.passwordComplex,
    };
    const message = passwordStrengthResult.valid
      ? strength === 2
        ? strings.modals.ChangePassword.passwordWeak
        : strings.modals.ChangePassword.passwordStrong
      : reasonMessages[passwordStrengthResult.reason];

    return {
      strength: passwordStrengthResult.valid ? passwordStrengthResult.strength : '',
      newPasswordStatusMessage: isDirty ? (
        <StrengthMeter style={tailwind('mt-2')} value={strength} maxValue={3} message={message as string} />
      ) : (
        ''
      ),
    };
  }, [newPassword, isDirty]);
  const toggleShowNewPassword = () => setShowNewPassword(!showNewPassword);
  const toggleShowConfirmNewPassword = () => {
    setShowConfirmNewPassword(!showConfirmNewPassword);
  };
  const onSubmitButtonPressed = handleSubmit((data) => {
    setIsLoading(true);
    // dispatch(authThunks.changePasswordThunk({ newPassword: data.newPassword }))
    //   .unwrap()
    //   .then(() => {
    //     props.onFormSubmitSuccess?.();
    //     setValue('newPassword', '');
    //     setValue('confirmNewPassword', '');
    //   })
    //   .catch(() => undefined)
    //   .finally(() => {
    //     setIsLoading(false);
    //   });
  });

  return (
    <>
      <Controller
        name="newPassword"
        control={control}
        render={({ field, fieldState }) => (
          <AppTextInput
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            value={field.value}
            secureTextEntry={!showNewPassword}
            autoFocus
            containerStyle={tailwind('mb-3')}
            status={[
              isDirty && fieldState.error
                ? 'error'
                : strength === 'medium'
                ? 'warning'
                : strength === 'hard'
                ? 'success'
                : 'idle',
              newPasswordStatusMessage,
            ]}
            label={strings.inputs.newPassword}
            renderAppend={() => (
              <TouchableWithoutFeedback onPress={toggleShowNewPassword}>
                <View>
                  {showNewPassword ? (
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
      <Controller
        name="confirmNewPassword"
        control={control}
        render={({ field, fieldState }) => (
          <AppTextInput
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            value={field.value}
            secureTextEntry={!showConfirmNewPassword}
            status={[fieldState.error ? 'error' : 'idle', fieldState.error?.message || '']}
            containerStyle={tailwind('mb-6')}
            label={strings.inputs.confirmNewPassword}
            renderAppend={() => (
              <TouchableWithoutFeedback onPress={toggleShowConfirmNewPassword}>
                <View>
                  {showConfirmNewPassword ? (
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

      {props.renderActionsContainer({ onSubmitButtonPressed, isLoading, isValid, isDirty })}
    </>
  );
};

export default ChangePasswordForm;
