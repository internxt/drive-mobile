import React, { useState } from 'react';
import { View } from 'react-native';

import strings from '../../../../assets/lang/strings';
import CenterModal from '../CenterModal';
import AppButton from '../../AppButton';
import { useTailwind } from 'tailwind-rn';
import AppText from '../../AppText';
import { BaseModalProps } from '../../../types/ui';
import { useNavigation } from '@react-navigation/native';
import { SettingsScreenNavigationProp } from 'src/types/navigation';
import AuthenticationForm from 'src/components/forms/AuthenticationForm';

const SecurityModal = (props: BaseModalProps) => {
  const tailwind = useTailwind();
  const navigation = useNavigation<SettingsScreenNavigationProp<'Security'>>();
  const [isLoading, setIsLoading] = useState(false);
  const onFormLoadingChanged = (isLoading: boolean) => {
    setIsLoading(isLoading);
  };
  const onFormSubmitSuccess = () => {
    navigation.navigate('Security');
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
        <AppText style={tailwind('text-xl mb-1.5')} medium>
          {strings.modals.Security.title}
        </AppText>

        <AppText style={tailwind('mb-6 text-sm text-gray-60')}>{strings.modals.Security.advice}</AppText>

        <AuthenticationForm
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
                title={isLoading ? strings.buttons.accessing : strings.buttons.access}
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

export default SecurityModal;
