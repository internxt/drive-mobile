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

const schema: yup.SchemaOf<ChangePasswordFormData> = yup
  .object()
  .shape({
    newPassword: yup.string().required(strings.errors.requiredField),
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

const ChangePasswordForm = (props: BaseFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const {
    control,
    handleSubmit,
    setValue,
    formState: { isDirty, isValid },
  } = useForm<ChangePasswordFormData>({
    resolver: yupResolver(schema),
    mode: 'onChange',
    defaultValues: {
      newPassword: '',
      confirmNewPassword: '',
    },
  });
  const { newPassword } = useWatch({ control });
  const newPasswordStatusMessage = useMemo(() => {
    return <StrengthMeter style={tailwind('mt-2')} value={2} maxValue={3} message={'Password strength error'} />;
  }, [newPassword]);
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
            status={[fieldState.error ? 'error' : 'idle', newPasswordStatusMessage]}
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
              ) : (
                <></>
              )
            }
          />
        )}
      />

      {props.renderActionsContainer({ onSubmitButtonPressed, isLoading, isValid, isDirty })}
    </>
  );
};

export default ChangePasswordForm;
