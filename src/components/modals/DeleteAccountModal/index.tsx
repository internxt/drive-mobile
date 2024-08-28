import { ClockCounterClockwise, FolderSimple, ImageSquare, Tray, WarningCircle } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../../assets/lang/strings';
import useGetColor from '../../../hooks/useColor';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { authSelectors, authThunks } from '../../../store/slices/auth';
import { BaseModalProps } from '../../../types/ui';
import AppButton from '../../AppButton';

import AppText from '../../AppText';
import BottomModal from '../BottomModal';

const DeleteAccountModal = (props: BaseModalProps) => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const dispatch = useAppDispatch();

  const [currentStep, setCurrentStep] = useState(0);
  const [selectedPollOption, setSelectedPollOption] = useState<string>();
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const onPollOptionSelected = (option: { key: string; message: string }) => {
    setSelectedPollOption(option.key);
  };
  const onCancelButtonPressed = () => {
    props.onClose();
  };
  const goToNextStep = () => {
    setCurrentStep(currentStep + 1);
  };
  const onContinueButtonPressed = () => {
    goToNextStep();
  };
  const onDeleteButtonPressed = () => {
    setIsDeletingAccount(true);

    dispatch(authThunks.deleteAccountThunk())
      .unwrap()
      .then(() => undefined)
      .catch(() => undefined)
      .finally(() => {
        setIsDeletingAccount(false);
      });
  };

  const renderConfirmationStep = () => (
    <>
      <View style={tailwind('items-center mb-4')}>
        <Tray size={48} color={getColor('text-primary')} />
      </View>

      <AppText medium style={tailwind('mb-4 px-4 text-center text-lg')}>
        {strings.modals.DeleteAccount.confirmationEmail}
      </AppText>

      <AppText style={tailwind('mb-10 text-center text-gray-60')}>
        {strings.modals.DeleteAccount.confirmationEmailExpiration}
      </AppText>

      <AppButton title={strings.buttons.close} type="accept" onPress={onCancelButtonPressed} />
    </>
  );
  const steps = [{ key: 'confirmation', render: renderConfirmationStep }];

  useEffect(() => {
    if (props.isOpen) {
      setCurrentStep(0);
      setSelectedPollOption(undefined);
      onDeleteButtonPressed();
    }
  }, [props.isOpen]);

  return (
    <BottomModal isOpen={props.isOpen} onClosed={props.onClose} topDecoration>
      <View style={tailwind('px-4 pb-4')}>
        <AppText style={tailwind('text-center')} semibold>
          {strings.modals.DeleteAccount.title.toUpperCase()}
        </AppText>
        <AppText style={tailwind('mt-0.5 mb-6 text-sm text-gray-40 text-center')}>
          {strings.formatString(strings.generic.iOfN, currentStep + 1, steps.length)}
        </AppText>

        {steps[currentStep].render()}
      </View>
    </BottomModal>
  );
};

export default DeleteAccountModal;
