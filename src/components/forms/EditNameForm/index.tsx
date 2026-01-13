import { Controller, useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { useTailwind } from 'tailwind-rn';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import strings from '../../../../assets/lang/strings';
import { BaseFormProps, EditNameFormData } from '../../../types/ui';
import AppTextInput from '../../AppTextInput';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { authThunks } from '../../../store/slices/auth';

const schema: yup.ObjectSchema<EditNameFormData> = yup
  .object()
  .shape({
    name: yup.string().required(strings.errors.requiredField),
    lastName: yup.string().required(),
  })
  .required();

const EditNameForm = (props: BaseFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const tailwind = useTailwind();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const {
    control,
    handleSubmit,
    formState: { isValid, isDirty },
  } = useForm<EditNameFormData>({
    resolver: yupResolver(schema),
    mode: 'onChange',
    defaultValues: {
      name: user?.name || '',
      lastName: user?.lastname || '',
    },
  });
  const onSubmitButtonPressed = handleSubmit((data) => {
    setIsLoading(true);
    dispatch(authThunks.updateProfileThunk({ name: data.name, lastname: data.lastName }))
      .then(() => props.onFormSubmitSuccess?.())
      .catch(() => undefined)
      .finally(() => {
        setIsLoading(false);
      });
  });

  useEffect(() => {
    props.onFormLoadingChange?.(isLoading);
  }, [isLoading]);

  return (
    <>
      <Controller
        name="name"
        control={control}
        render={({ field, fieldState }) => (
          <AppTextInput
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            value={field.value}
            autoFocus
            containerStyle={tailwind('mb-3')}
            status={[fieldState.error ? 'error' : 'idle', fieldState.error?.message]}
            label={strings.inputs.name}
          />
        )}
      />
      <Controller
        name="lastName"
        control={control}
        render={({ field, fieldState }) => (
          <AppTextInput
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            value={field.value}
            status={[fieldState.error ? 'error' : 'idle', fieldState.error?.message || '']}
            containerStyle={tailwind('mb-6')}
            label={strings.inputs.lastName}
          />
        )}
      />

      {props.renderActionsContainer({ onSubmitButtonPressed, isLoading, isValid, isDirty })}
    </>
  );
};

export default EditNameForm;
