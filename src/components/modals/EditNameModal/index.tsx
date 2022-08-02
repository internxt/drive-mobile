import React, { useState } from 'react';
import { View } from 'react-native';

import strings from '../../../../assets/lang/strings';
import CenterModal from '../CenterModal';
import AppButton from '../../AppButton';
import { useTailwind } from 'tailwind-rn';
import AppText from '../../AppText';
import { BaseModalProps } from '../../../types/ui';
import EditNameForm from '../../forms/EditNameForm';

const EditNameModal = (props: BaseModalProps) => {
  const tailwind = useTailwind();
  const [isLoading, setIsLoading] = useState(false);
  const onFormLoadingChanged = (isLoading: boolean) => {
    setIsLoading(isLoading);
  };
  const onFormSubmitSuccess = () => {
    props.onClose();
  };
  const onClosed = () => {
    props.onClose();
  };
  const onCancelButtonPressed = () => {
    props.onClose();
  };

  return (
    <CenterModal
      isOpen={props.isOpen}
      onClosed={onClosed}
      backdropPressToClose={!isLoading}
      backButtonClose={!isLoading}
    >
      <View style={tailwind('p-4')}>
        <AppText style={tailwind('text-xl mb-6')} medium>
          {strings.modals.EditName.title}
        </AppText>

        <EditNameForm
          onFormLoadingChange={onFormLoadingChanged}
          onFormSubmitSuccess={onFormSubmitSuccess}
          renderActionsContainer={({ isDirty, isValid, isLoading, onSubmitButtonPressed }) => (
            <View style={tailwind('mt-6 flex-row justify-between')}>
              <AppButton
                title={strings.buttons.cancel}
                type="cancel"
                onPress={onCancelButtonPressed}
                disabled={isLoading}
                style={tailwind('flex-1')}
              />

              <View style={tailwind('px-1')}></View>

              <AppButton
                title={isLoading ? strings.buttons.updating : strings.buttons.update}
                type="accept"
                onPress={onSubmitButtonPressed}
                loading={isLoading}
                disabled={!isDirty || !isValid || isLoading}
                style={tailwind('flex-1')}
              />
            </View>
          )}
        />
      </View>
    </CenterModal>
  );
};

export default EditNameModal;
