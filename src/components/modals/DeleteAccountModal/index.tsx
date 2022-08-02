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
import AppPoll from '../../AppPoll';
import AppText from '../../AppText';
import UserProfilePicture from '../../UserProfilePicture';
import BottomModal from '../BottomModal';

const DeleteAccountModal = (props: BaseModalProps) => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const userFullName = useAppSelector(authSelectors.userFullName);
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
  const pollOptions = [
    {
      key: 'better-alternative',
      message: strings.modals.DeleteAccount.poll.options['better-alternative'],
    },
    {
      key: 'save-money',
      message: strings.modals.DeleteAccount.poll.options['save-money'],
    },
    {
      key: 'technical-issues',
      message: strings.modals.DeleteAccount.poll.options['technical-issues'],
    },
    {
      key: 'other',
      message: strings.modals.DeleteAccount.poll.options.other,
    },
  ];
  const renderPollStep = () => {
    return (
      <>
        <View style={tailwind('mb-5 items-center')}>
          <UserProfilePicture uri={user?.avatar} size={112} />
        </View>

        <AppText medium style={tailwind('mb-10 px-4 text-center text-lg')}>
          {strings.formatString(strings.modals.DeleteAccount.apologies, userFullName)}
        </AppText>

        <AppPoll
          title={strings.modals.DeleteAccount.poll.title}
          options={pollOptions}
          selectedOptionKey={selectedPollOption}
          advice={strings.modals.DeleteAccount.poll.advice}
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
  const renderImpactStep = () => {
    const items = [
      {
        key: 'files',
        icon: <FolderSimple color={getColor('text-primary')} size={24} />,
        label: strings.modals.DeleteAccount.impact.files,
        redLabel: '76GB of Documents',
      },
      {
        key: 'backups',
        icon: <ClockCounterClockwise color={getColor('text-primary')} size={24} />,
        label: strings.modals.DeleteAccount.impact.backups,
        redLabel: '12GB of Backups',
      },
      {
        key: 'photos',
        icon: <ImageSquare color={getColor('text-primary')} size={24} />,
        label: strings.modals.DeleteAccount.impact.photos,
        redLabel: '2.468 Photos',
      },
    ];
    const renderImpactItems = () =>
      items.map((item, index) => {
        const isTheLast = index === items.length - 1;

        return (
          <View key={item.key}>
            <View style={tailwind('flex-row items-center justify-between py-4 px-4')}>
              <View style={tailwind('flex-row items-center')}>
                {item.icon}
                <AppText style={tailwind('ml-3 text-lg')}>{item.label}</AppText>
              </View>
              <AppText style={tailwind('text-red-')} medium>
                {item.redLabel}
              </AppText>
            </View>
            {!isTheLast && <View style={{ ...tailwind('mx-4 bg-gray-10'), height: 1 }} />}
          </View>
        );
      });

    return (
      <>
        <View style={tailwind('items-center mb-4')}>
          <WarningCircle size={48} color={getColor('text-red-')} />
        </View>

        <AppText medium style={tailwind('mb-10 px-4 text-center text-lg')}>
          {strings.modals.DeleteAccount.impact.advice}
        </AppText>

        <View>
          <AppText style={tailwind('ml-4 mb-2')}>{strings.modals.DeleteAccount.impact.youWillLose}</AppText>
          <View style={tailwind('rounded-xl bg-gray-5')}>{renderImpactItems()}</View>
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
            disabled={isDeletingAccount}
            onPress={onDeleteButtonPressed}
          />
        </View>
      </>
    );
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
