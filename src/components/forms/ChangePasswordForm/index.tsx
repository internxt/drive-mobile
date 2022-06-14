import { Eye, EyeSlash } from 'phosphor-react-native';
import { Controller, useForm } from 'react-hook-form';
import { useState } from 'react';
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

const schema = yup
  .object()
  .shape({
    newPassword: yup.string().required(),
    confirmNewPassword: yup
      .string()
      .required()
      .test({
        name: 'passwordsDoNotMatch',
        message: 'Passwords do not match',
        test: function (value) {
          return value === this.parent.newPassword;
        },
      }),
  })
  .required();

const ChangePasswordForm = (props: BaseFormProps) => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const { control, handleSubmit, setValue, formState } = useForm<ChangePasswordFormData>({
    resolver: yupResolver(schema),
    reValidateMode: 'onBlur',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
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
        render={({ field }) => (
          <AppTextInput
            {...field}
            secureTextEntry={!showNewPassword}
            autoFocus
            containerStyle={tailwind('mb-3')}
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
        render={({ field }) => (
          <AppTextInput
            {...field}
            secureTextEntry={!showConfirmNewPassword}
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

      {props.renderActionsContainer({ onSubmitButtonPressed, isLoading, isValid: formState.isValid })}
    </>
  );
};

export default ChangePasswordForm;
