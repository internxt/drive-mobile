import { View } from 'react-native';
import strings from '../../../../assets/lang/strings';
import { BaseModalProps } from '../../../types/ui';
import AppButton from '../../AppButton';
import AppText from '../../AppText';
import ChangePasswordForm from '../../forms/ChangePasswordForm';
import CenterModal from '../CenterModal';

const ChangePasswordModal = (props: BaseModalProps) => {
  const onCancelButtonPressed = () => {
    props.onClose();
  };
  const onFormSubmitSuccess = () => {
    props.onClose();
  };

  return (
    <CenterModal isOpen={props.isOpen} onClosed={props.onClose}>
      <View className="p-4">
        <AppText className="text-xl mb-6" medium>
          {strings.modals.ChangePassword.title}
        </AppText>

        <ChangePasswordForm
          onFormSubmitSuccess={onFormSubmitSuccess}
          renderActionsContainer={({ onSubmitButtonPressed, isValid, isLoading }) => (
            <View className="flex-row">
              <AppButton
                className="flex-1 mr-1.5"
                type="cancel"
                title={strings.buttons.cancel}
                onPress={onCancelButtonPressed}
              />
              <AppButton
                loading={isLoading}
                disabled={!isValid}
                className="flex-1"
                type="accept"
                title={isLoading ? strings.buttons.changing : strings.buttons.change}
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
