import { Eye, EyeSlash } from 'phosphor-react-native';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useMemo, useState } from 'react';
import { TouchableWithoutFeedback, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import strings from '../../../../assets/lang/strings';
import useGetColor from '../../../hooks/useColor';
import authService from '../../../services/AuthService';
import notificationsService from '../../../services/NotificationsService';
import { NotificationType } from '../../../types';
import { BaseFormProps, ChangePasswordFormData } from '../../../types/ui';
import AppTextInput from '../../AppTextInput';
import StrengthMeter from '../../StrengthMeter';
import { auth } from '@internxt/lib';
import { useAppSelector } from '../../../store/hooks';

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
  const newPasswordStatusMessage = useMemo(() => {
    const passwordStrengthResult = auth.testPasswordStrength(newPassword || '', user?.email || '');
    const strength = passwordStrengthResult.valid ? (passwordStrengthResult.strength === 'medium' ? 2 : 3) : 1;
    const reasonMessages = {
      ['NOT_LONG_ENOUGH']: strings.errors.passwordLength,
      ['NOT_COMPLEX_ENOUGH']: strings.errors.passwordNumber,
    };
    const message = passwordStrengthResult.valid
      ? strength === 2
        ? strings.modals.ChangePassword.passwordWeak
        : strings.modals.ChangePassword.passwordStrong
      : reasonMessages[passwordStrengthResult.reason];

    return isDirty ? (
      <StrengthMeter style={tailwind('mt-2')} value={strength} maxValue={3} message={message as string} />
    ) : (
      ''
    );
  }, [newPassword, isDirty]);
  const toggleShowNewPassword = () => setShowNewPassword(!showNewPassword);
  const toggleShowConfirmNewPassword = () => {
    setShowConfirmNewPassword(!showConfirmNewPassword);
  };
  const onSubmitButtonPressed = handleSubmit((data) => {
    setIsLoading(true);
    authService
      .doRecoverPassword(data.newPassword)
      .then(() => {
        setValue('newPassword', '');
        setValue('confirmNewPassword', '');
        notificationsService.show({ text1: strings.messages.passwordChanged, type: NotificationType.Success });
        props.onFormSubmitSuccess?.();
      })
      .catch((err: Error) => {
        notificationsService.show({ type: NotificationType.Error, text1: err.message });
      })
      .finally(() => {
        setIsLoading(false);
      });
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
            status={[isDirty && fieldState.error ? 'error' : 'idle', newPasswordStatusMessage]}
            label={strings.inputs.newPassword}
            renderAppend={({ isFocused }) =>
              isFocused ? (
                <TouchableWithoutFeedback onPress={toggleShowNewPassword}>
                  <View>
                    {showNewPassword ? (
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
        name="confirmNewPassword"
        control={control}
        render={({ field, fieldState, formState }) => (
          <AppTextInput
            editable={!!newPassword && !formState.errors.newPassword}
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            value={field.value}
            secureTextEntry={!showConfirmNewPassword}
            status={[fieldState.error ? 'error' : 'idle', fieldState.error?.message || '']}
            containerStyle={tailwind('mb-6')}
            label={strings.inputs.confirmNewPassword}
            renderAppend={({ isFocused }) =>
              isFocused ? (
                <TouchableWithoutFeedback onPress={toggleShowConfirmNewPassword}>
                  <View>
                    {showConfirmNewPassword ? (
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

export default ChangePasswordForm;
