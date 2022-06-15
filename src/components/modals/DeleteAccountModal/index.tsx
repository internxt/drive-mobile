import { WarningCircle } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../../assets/lang/strings';
import useGetColor from '../../../hooks/useColor';
import { useAppSelector } from '../../../store/hooks';
import { authSelectors } from '../../../store/slices/auth';
import { BaseModalProps } from '../../../types/ui';
import AppButton from '../../AppButton';
import AppPoll from '../../AppPoll';
import AppText from '../../AppText';
import BottomModal from '../BottomModal';

const DeleteAccountModal = (props: BaseModalProps) => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const userFullName = useAppSelector(authSelectors.userFullName);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedPollOption, setSelectedPollOption] = useState<string>();
  const onPollOptionSelected = (option: { key: string; message: string }) => {
    setSelectedPollOption(option.key);
  };
  const onCancelButtonPressed = () => {
    props.onClose();
  };
  const onContinueButtonPressed = () => {
    setCurrentStep(currentStep + 1);
  };
  const onDeleteButtonPressed = () => {
    // TODO
  };
  const pollOptions = [
    {
      key: 'better-alternative',
      message: strings.modals.DeleteAccountModal.poll.options['better-alternative'],
    },
    {
      key: 'save-money',
      message: strings.modals.DeleteAccountModal.poll.options['save-money'],
    },
    {
      key: 'technical-issues',
      message: strings.modals.DeleteAccountModal.poll.options['technical-issues'],
    },
    {
      key: 'other',
      message: strings.modals.DeleteAccountModal.poll.options.other,
    },
  ];
  const renderPollStep = () => {
    return (
      <>
        <View style={tailwind('mb-5 items-center')}>
          <Image source={require('../../../../assets/icon.png')} style={tailwind('h-28 w-28 rounded-full')} />
        </View>

        <AppText medium style={tailwind('mb-10 px-4 text-center text-lg')}>
          {strings.formatString(strings.modals.DeleteAccountModal.apologies, userFullName)}
        </AppText>

        <AppPoll
          title={strings.modals.DeleteAccountModal.poll.title}
          options={pollOptions}
          selectedOptionKey={selectedPollOption}
          advice={strings.modals.DeleteAccountModal.poll.advice}
          onOptionSelected={onPollOptionSelected}
        />

        <View style={tailwind('flex-row mt-6')}>
          <AppButton
            style={tailwind('flex-1 mr-1')}
            title={strings.buttons.cancel}
            type="cancel"
            onPress={onCancelButtonPressed}
          />
          <AppButton
            style={tailwind('flex-1')}
            disabled={!selectedPollOption}
            title={strings.buttons.continue}
            type="accept"
            onPress={onContinueButtonPressed}
          />
        </View>
      </>
    );
  };
  const renderImpactStep = () => (
    <>
      <View style={tailwind('items-center mb-4')}>
        <WarningCircle size={48} color={getColor('text-red-')} />
      </View>

      <AppText medium style={tailwind('mb-10 px-4 text-center text-lg')}>
        {strings.modals.DeleteAccountModal.impact}
      </AppText>

      <View>
        <AppText>{'You will lose'}</AppText>
        <View style={tailwind('rounded-xl bg-gray-5')}></View>
      </View>

      <View style={tailwind('flex-row mt-6')}>
        <AppButton
          style={tailwind('flex-1 mr-1')}
          title={strings.buttons.cancel}
          type="cancel"
          onPress={onCancelButtonPressed}
        />
        <AppButton
          style={tailwind('flex-1')}
          title={strings.buttons.delete}
          type="delete"
          onPress={onDeleteButtonPressed}
        />
      </View>
    </>
  );
  const renderConfirmationStep = () => <></>;
  const steps = [
    {
      key: 'poll',
      render: renderPollStep,
    },
    { key: 'impact', render: renderImpactStep },
    { key: 'confirmation', render: renderConfirmationStep },
  ];

  useEffect(() => {
    if (props.isOpen) {
      setCurrentStep(0);
      setSelectedPollOption(undefined);
    }
  }, [props.isOpen]);

  return (
    <BottomModal isOpen={props.isOpen} onClosed={props.onClose} topDecoration>
      <View style={tailwind('px-4 pb-4')}>
        <AppText style={tailwind('text-center')} semibold>
          {strings.modals.DeleteAccountModal.title.toUpperCase()}
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
