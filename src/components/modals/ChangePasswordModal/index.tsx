import { View } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../../assets/lang/strings';
import { BaseModalProps } from '../../../types/ui';
import AppButton from '../../AppButton';
import AppText from '../../AppText';
import ChangePasswordForm from '../../forms/ChangePasswordForm';
import CenterModal from '../CenterModal';

const ChangePasswordModal = (props: BaseModalProps) => {
  const tailwind = useTailwind();
  const onCancelButtonPressed = () => {
    props.onClose();
  };

  return (
    <CenterModal isOpen={props.isOpen} onClosed={props.onClose}>
      <View style={tailwind('p-4')}>
        <AppText style={tailwind('text-xl mb-6')} medium>
          {strings.modals.ChangePassword.title}
        </AppText>

        <ChangePasswordForm
          renderActionsContainer={({ onSubmitButtonPressed, isValid, isLoading }) => (
            <View style={tailwind('flex-row')}>
              <AppButton
                style={tailwind('flex-1 mr-1.5')}
                type="cancel"
                title={strings.buttons.cancel}
                onPress={onCancelButtonPressed}
              />
              <AppButton
                loading={isLoading}
                disabled={!isValid}
                style={tailwind('flex-1')}
                type="accept"
                title={strings.buttons.change}
                onPress={onSubmitButtonPressed}
              />
            </View>
          )}
        />
      </View>
    </CenterModal>
  );
};

export default ChangePasswordModal;
