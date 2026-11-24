import Portal from '@burstware/react-native-portal';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { View } from 'react-native';
import AuthenticationForm from 'src/components/forms/AuthenticationForm';
import { SettingsScreenNavigationProp } from 'src/types/navigation';
import strings from '../../../../assets/lang/strings';
import { BaseModalProps } from '../../../types/ui';
import AppButton from '../../AppButton';
import AppText from '../../AppText';
import CenterModal from '../CenterModal';

const SecurityModal = (props: BaseModalProps) => {
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
    <Portal>
      <CenterModal
        isOpen={props.isOpen}
        onClosed={onClosed}
        backdropPressToClose={!isLoading}
        backButtonClose={!isLoading}
      >
        <View className="p-4">
          <AppText className="text-xl mb-1.5" medium>
            {strings.modals.Security.title}
          </AppText>

          <AppText className="mb-6 text-sm text-gray-60">{strings.modals.Security.advice}</AppText>

          <AuthenticationForm
            onFormLoadingChange={onFormLoadingChanged}
            onFormSubmitSuccess={onFormSubmitSuccess}
            renderActionsContainer={({ isDirty, isValid, isLoading, onSubmitButtonPressed }) => (
              <View className="mt-6 flex-row justify-between">
                <AppButton
                  title={strings.buttons.cancel}
                  type="cancel"
                  onPress={onCancelButtonPressed}
                  disabled={isLoading}
                  className="flex-1"
                />

                <View className="px-1"></View>

                <AppButton
                  title={isLoading ? strings.buttons.accessing : strings.buttons.access}
                  type="accept"
                  onPress={onSubmitButtonPressed}
                  loading={isLoading}
                  disabled={!isDirty || !isValid || isLoading}
                  className="flex-1"
                />
              </View>
            )}
          />
        </View>
      </CenterModal>
    </Portal>
  );
};

export default SecurityModal;
