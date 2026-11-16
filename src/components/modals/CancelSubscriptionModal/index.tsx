import { ArrowLeft, Tray, Warning } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import StorageUsageBar from 'src/components/StorageUsageBar';
import storageService, { FREE_STORAGE } from 'src/services/StorageService';
import { paymentsActions, paymentsThunks } from 'src/store/slices/payments';
import { storageSelectors } from 'src/store/slices/storage';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../../assets/lang/strings';
import useGetColor from '../../../hooks/useColor';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { authSelectors } from '../../../store/slices/auth';
import { BaseModalProps } from '../../../types/ui';
import AppButton from '../../AppButton';
import AppText from '../../AppText';
import BottomModal from '../BottomModal';

const CancelSubscriptionModal = (props: BaseModalProps & { onSubscriptionCancelled: () => void }) => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const dispatch = useAppDispatch();
  const usage = useAppSelector(storageSelectors.usage);
  const { limit } = useAppSelector((state) => state.storage);
  const userFullName = useAppSelector(authSelectors.userFullName);
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const isDowngrading = usage >= FREE_STORAGE;
  const onCancelButtonPressed = () => {
    props.onClose();
  };

  const onCancelSubscriptionButtonPressed = () => {
    setIsLoading(true);

    dispatch(paymentsThunks.cancelSubscriptionThunk())
      .unwrap()
      .then(() => {
        props.onClose();
        dispatch(paymentsActions.setSubscriptionAsFree());
        props.onSubscriptionCancelled();
      })
      .catch(() => undefined)
      .finally(() => {
        setIsLoading(false);
      });
  };
  const renderCancelSubscription = () => (
    <>
      <AppText lineHeight={1.2} className="text-center text-lg mb-5" medium>
        {strings.formatString(strings.modals.CancelSubscription.steps['cancel-subscription'].advice, userFullName)}
      </AppText>

      {isDowngrading && (
        <View className="mb-9">
          <View className="p-3 rounded-lg bg-red/5 flex-row">
            <Warning weight="fill" color={getColor('text-red')} size={20} style={tailwind('mt-0.5 mr-3')} />
            <AppText lineHeight={1.2} className="text-sm flex-1 text-red">
              {strings.formatString(
                strings.modals.CancelSubscription.steps['cancel-subscription'].storageDowngradeWarning,
                storageService.toString(usage),
                storageService.toString(FREE_STORAGE),
              )}
            </AppText>
          </View>
          <View className="mt-5">
            <StorageUsageBar
              className="mt-5"
              usageBytes={usage}
              limitBytes={limit}
              selectedStorageBytes={FREE_STORAGE}
            />
          </View>
        </View>
      )}

      <View className="rounded-xl bg-gray-5/50 p-4 mb-10">
        <View className="flex-row justify-center items-center">
          <AppText className="text-4xl text-red">{storageService.toString(FREE_STORAGE)}</AppText>
          <ArrowLeft style={tailwind('mx-3')} />
          <AppText className="text-4xl line-through">{storageService.toString(limit)}</AppText>
        </View>
        <AppText className="mt-2 text-center">
          {strings.formatString(
            strings.modals.CancelSubscription.steps['cancel-subscription'].storageDowngrade,
            storageService.toString(limit),
            storageService.toString(FREE_STORAGE),
          )}
        </AppText>
      </View>

      <AppButton
        type="cancel"
        onPress={onCancelSubscriptionButtonPressed}
        title={isLoading ? strings.buttons.cancelling : strings.buttons.cancelSubscription}
        disabled={isLoading}
        loading={isLoading}
      />
    </>
  );
  const renderConfirmationStep = () => (
    <>
      <View className="items-center mb-4">
        <Tray size={48} color={getColor('text-primary')} />
      </View>

      <AppText medium className="mb-4 px-4 text-center text-lg">
        {strings.modals.CancelSubscription.steps.confirmation.advice}
      </AppText>

      <AppText className="mb-10 text-center text-gray-60">
        {strings.modals.CancelSubscription.steps.confirmation.spam}
      </AppText>

      <AppButton title={strings.buttons.close} type="accept" onPress={onCancelButtonPressed} />
    </>
  );
  const steps = [
    { key: 'cancel-subscription', render: renderCancelSubscription },
    { key: 'confirmation', render: renderConfirmationStep },
  ];

  useEffect(() => {
    if (props.isOpen) {
      setCurrentStep(0);
    }
  }, [props.isOpen]);

  return (
    <BottomModal isOpen={props.isOpen} onClosed={props.onClose} topDecoration>
      <View className="px-4 pb-4">
        <AppText className="text-center mb-6" semibold>
          {strings.modals.CancelSubscription.title.toUpperCase()}
        </AppText>

        {steps[currentStep].render()}
      </View>
    </BottomModal>
  );
};

export default CancelSubscriptionModal;
