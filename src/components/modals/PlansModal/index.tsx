import React, { useEffect, useState } from 'react';
import { ScrollView, TouchableWithoutFeedback, View } from 'react-native';

import Animated, { FadeInDown } from 'react-native-reanimated';
import AppButton from 'src/components/AppButton';
import AppText from 'src/components/AppText';
import StorageUsageBar from 'src/components/StorageUsageBar';
import storageService from 'src/services/StorageService';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { paymentsSelectors, paymentsThunks } from 'src/store/slices/payments';
import { storageSelectors } from 'src/store/slices/storage';
import { useTailwind } from 'tailwind-rn';
import FileIcon from '../../../../assets/icons/file-icon.svg';
import strings from '../../../../assets/lang/strings';
import { BaseModalProps } from '../../../types/ui';
import BottomModal from '../BottomModal';
import { ConfirmationStep } from './ConfirmationStep';

import errorService from '@internxt-mobile/services/ErrorService';
import { notifications } from '@internxt-mobile/services/NotificationsService';
import prettysize from 'prettysize';
import { getLineHeight } from 'src/styles/global';

export type SubscriptionInterval = 'month' | 'year';

const formatAmount = (amount: number | undefined) => ((amount || 0) * 0.01).toFixed(2);

const PlansModal = (props: BaseModalProps) => {
  const [selectedStorageBytes, setSelectedStorageBytes] = useState<number>();
  const [selectedInterval, setSelectedInterval] = useState<SubscriptionInterval>();
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [newSubscriptionPriceId, setNewSubscriptionPriceId] = useState<string>();
  const tailwind = useTailwind();
  const dispatch = useAppDispatch();
  const [isConfirming, setIsConfirming] = useState(false);
  const pricesBySize = useAppSelector(paymentsSelectors.pricesBySize);
  const { subscription } = useAppSelector((state) => state.payments);

  const { limit } = useAppSelector((state) => state.storage);
  const usage = useAppSelector(storageSelectors.usage);

  const getDisplayPriceWithIntervals = (bytes: number) => {
    return pricesBySize[bytes];
  };

  const getDisplayPriceByInterval = (bytes: number, interval: SubscriptionInterval) => {
    return getDisplayPriceWithIntervals(bytes).find((bySize) => bySize.interval === interval);
  };
  const isUpgrading = subscription.type === 'free';

  const hasSubscription = subscription.type !== 'free';

  const getPlanUpgradeTitle = () => {
    if (isConfirming) {
      return strings.modals.Plans.changePlan.title;
    }
    if (isUpgrading) {
      return strings.modals.Plans.title;
    }

    if (hasSubscription) {
      return strings.modals.Plans.changePlan.title;
    }
  };

  const getPlanUpgradeSubtitle = () => {
    if (isConfirming) {
      return strings.modals.Plans.changePlan.message;
    }
    if (isUpgrading) {
      return strings.modals.Plans.advice;
    }

    if (hasSubscription) {
      return (
        <>
          {strings.modals.Plans.yourCurrentPlan}{' '}
          <AppText semibold style={tailwind('')}>
            {prettysize(limit).replace(' ', '')}
          </AppText>
        </>
      );
    }
  };
  const onOpen = () => {
    if (subscription.type === 'free') {
      const byteSizes = Object.keys(pricesBySize);
      setSelectedStorageBytes(parseInt(byteSizes[0]));
      setSelectedInterval('month');
    } else if (subscription.type === 'subscription') {
      const pricesArray = Object.entries(pricesBySize).map(([sizeInBytes, prices]) => {
        return {
          bytes: parseInt(sizeInBytes),
          prices,
        };
      });

      const currentPlanIndex = pricesArray.findIndex((price) => price.bytes === limit);

      const nextPlan = pricesArray[currentPlanIndex + 1];
      const previousPlan = pricesArray[currentPlanIndex - 1];

      // If there's a superior plan available select it
      if (nextPlan) {
        setSelectedStorageBytes(nextPlan.bytes);
        setSelectedInterval(subscription.interval);
      }

      // If user has max plan selected, select the previous one
      if (previousPlan && !nextPlan) {
        setSelectedStorageBytes(previousPlan.bytes);
        setSelectedInterval(subscription.interval);
      }
    }
  };
  const onClosed = () => {
    props.onClose();
    setIsConfirming(false);
  };

  const handleConfirmUpdateSubscription = async () => {
    try {
      setLoadingCheckout(true);
      if (!newSubscriptionPriceId) return;
      await dispatch(paymentsThunks.createSessionThunk(newSubscriptionPriceId)).unwrap();
    } catch (error) {
      notifications.error(strings.errors.generic.title);
      errorService.reportError(error);
    } finally {
      setLoadingCheckout(false);
    }
  };

  const onPriceButtonPressed = async (priceId: string, interval: SubscriptionInterval) => {
    setNewSubscriptionPriceId(priceId);
    if (subscription.type === 'free') {
      try {
        setLoadingCheckout(true);
        if (!newSubscriptionPriceId) return;
        await dispatch(paymentsThunks.createSessionThunk(priceId)).unwrap();
      } catch (error) {
        notifications.error(strings.errors.generic.title);
        errorService.reportError(error);
      } finally {
        setLoadingCheckout(false);
      }
    } else {
      setSelectedInterval(interval);
      setIsConfirming(true);
    }
  };
  const header = <View style={tailwind('bg-white')}></View>;
  const renderPrices = (selectedStorageBytes: number) =>
    Object.entries(pricesBySize).map(([bytesSize], index) => {
      const isTheLast = index === Object.keys(pricesBySize).length - 1;
      const isDisabled = parseInt(bytesSize) === limit;
      const isSelected = parseInt(bytesSize) === selectedStorageBytes;
      const onPress = () => {
        setSelectedStorageBytes(parseInt(bytesSize));
      };

      const hasStorageOverlflow = usage > selectedStorageBytes;

      return (
        <TouchableWithoutFeedback key={bytesSize} disabled={isDisabled} onPress={onPress}>
          <View
            style={[
              tailwind('flex-1 p-3 border border-gray-10 rounded-xl'),
              !isTheLast && tailwind('mr-2'),
              /* isDisabled && tailwind('border-gray-5'), */
              isSelected && (hasStorageOverlflow ? tailwind('border-red') : tailwind('border-primary')),
              isDisabled ? tailwind('bg-gray-5') : {},
            ]}
          >
            <AppText
              numberOfLines={1}
              style={[
                tailwind('text-center text-gray-100 text-xl'),
                isDisabled && tailwind('text-gray-40'),
                isSelected && (hasStorageOverlflow ? tailwind('text-red') : tailwind('text-primary')),
              ]}
              medium={isSelected}
            >
              {storageService.toString(parseInt(bytesSize))}
            </AppText>
          </View>
        </TouchableWithoutFeedback>
      );
    });

  const renderButtons = (selectedBytes: number) => {
    const displayPrices = getDisplayPriceWithIntervals(selectedBytes);
    const monthlyPrice = displayPrices.find((display) => display.interval === 'month');
    const yearlyPrice = displayPrices.find((display) => display.interval === 'year');
    const monthlyAmount = formatAmount(monthlyPrice?.amount);
    const yearlyAmount = formatAmount(yearlyPrice?.amount);

    return (
      <>
        <AppButton
          style={tailwind('flex-1 rounded-xl mr-2')}
          type="accept"
          disabled={loadingCheckout}
          loading={newSubscriptionPriceId === monthlyPrice?.id && loadingCheckout}
          title={
            <View>
              <AppText lineHeight={1.2} style={tailwind('text-center text-lg text-white')} medium>
                {strings.generic.monthly}
              </AppText>
              <AppText lineHeight={1.2} style={tailwind('text-center text-sm text-white opacity-75')}>
                {strings.formatString(strings.generic.pricePerMonth, monthlyAmount)}
              </AppText>
            </View>
          }
          onPress={() => onPriceButtonPressed(monthlyPrice?.id as string, 'month')}
        />
        <AppButton
          style={tailwind('flex-1 rounded-xl')}
          type="accept"
          disabled={loadingCheckout}
          loading={newSubscriptionPriceId === yearlyPrice?.id && loadingCheckout}
          title={
            <View>
              <AppText lineHeight={1.2} style={tailwind('text-center text-lg text-white')} medium>
                {strings.generic.yearly}
              </AppText>
              <AppText lineHeight={1.2} style={tailwind('text-center text-sm text-white opacity-75')}>
                {strings.formatString(strings.generic.pricePerYear, yearlyAmount)}
              </AppText>
            </View>
          }
          onPress={() => onPriceButtonPressed(yearlyPrice?.id as string, 'year')}
        />
      </>
    );
  };

  useEffect(() => {
    props.isOpen && onOpen();
  }, [props.isOpen]);

  const renderByStep = (selectedStorageBytes: number) => {
    if (isConfirming) {
      if (subscription.type === 'subscription' && selectedStorageBytes && selectedInterval) {
        const price = getDisplayPriceByInterval(selectedStorageBytes, selectedInterval);
        if (!price) return <></>;
        return (
          <View>
            <ConfirmationStep
              loading={loadingCheckout}
              onConfirm={handleConfirmUpdateSubscription}
              onBack={() => {
                setIsConfirming(false);
              }}
              currentPlan={{
                limitInBytes: limit,
                price: subscription.amount * 0.01,
                interval: subscription.interval,
              }}
              newPlan={{
                limitInBytes: price.bytes,
                price: price.amount * 0.01,
                interval: price.interval as SubscriptionInterval,
              }}
            />
          </View>
        );
      }

      return <></>;
    }

    const hasStorageOverlflow = usage > selectedStorageBytes;
    return (
      <View>
        <View>
          <AppText style={tailwind('text-center text-xs mb-3')} semibold>
            {strings.modals.Plans.howMuchStorage.toUpperCase()}
          </AppText>
          {selectedStorageBytes ? <View style={tailwind('flex-row')}>{renderPrices(selectedStorageBytes)}</View> : null}
        </View>

        {hasStorageOverlflow ? (
          <Animated.View entering={FadeInDown}>
            <View style={tailwind('mt-3 p-4 rounded-lg bg-red/5 border border-red/15 ')}>
              <View style={tailwind('mb-4')}>
                <StorageUsageBar limitBytes={limit} usageBytes={usage} selectedStorageBytes={selectedStorageBytes} />
              </View>
              <View style={tailwind('flex flex-row items-end')}>
                <AppText semibold style={tailwind('text-sm text-red')}>
                  {strings.formatString(
                    strings.modals.Plans.freeUpSpace.title,
                    storageService.toString(selectedStorageBytes),
                  )}
                </AppText>
                <AppText style={tailwind('text-sm text-red ml-1')}>({storageService.toString(usage)})</AppText>
              </View>
              <AppText style={[tailwind('text-sm text-red mt-0.5'), { lineHeight: getLineHeight(14, 1.2) }]}>
                {strings.modals.Plans.freeUpSpace.message}
              </AppText>
            </View>
          </Animated.View>
        ) : (
          <></>
        )}

        {selectedStorageBytes ? (
          <View style={tailwind('mt-5')}>
            <AppText style={tailwind('text-center text-xs mb-3')} semibold>
              {strings.modals.Plans.selectBillingPeriod.toUpperCase()}
            </AppText>
            <View style={tailwind('flex-row')}>{renderButtons(selectedStorageBytes)}</View>
          </View>
        ) : (
          <></>
        )}
      </View>
    );
  };
  return (
    <BottomModal
      isOpen={props.isOpen}
      onClosed={onClosed}
      header={header}
      modalStyle={tailwind('pt-16')}
      containerStyle={tailwind(`pb-6 pt-6 ${isConfirming ? 'px-0' : 'px-4'}`)}
      headerStyle={tailwind('bg-transparent absolute z-20')}
    >
      <ScrollView>
        <View style={tailwind('')}>
          <View style={tailwind('items-center')}>
            <FileIcon width={80} height={80} />
          </View>
          <AppText style={tailwind('text-center text-2xl mt-3 ')} medium>
            {getPlanUpgradeTitle()}
          </AppText>
          <AppText lineHeight={1.2} style={tailwind('text-center text-gray-60 mb-10 ')}>
            {getPlanUpgradeSubtitle()}
          </AppText>
        </View>
        {selectedStorageBytes ? renderByStep(selectedStorageBytes) : <></>}

        <View style={tailwind(`border-b border-gray-5 my-5 ${isConfirming ? 'mx-4' : ''}`)}></View>
        <View style={tailwind(`${isConfirming ? 'px-4' : ''} mt-auto`)}>
          <AppText style={tailwind('text-center text-sm')} semibold>
            {strings.modals.Plans.moneyBack}
          </AppText>
          <AppText style={tailwind('text-center text-sm mb-3')} semibold>
            {strings.modals.Plans.cancelAtAnyMoment}
          </AppText>
          <AppText lineHeight={1.2} style={tailwind('text-xs text-gray-40 text-center')}>
            {strings.modals.Plans.subscriptionRenew}
          </AppText>
        </View>
      </ScrollView>
    </BottomModal>
  );
};

export default PlansModal;
