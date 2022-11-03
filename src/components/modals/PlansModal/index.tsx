import React, { useEffect, useMemo, useState } from 'react';
import { Image, TouchableWithoutFeedback, View } from 'react-native';

import strings from '../../../../assets/lang/strings';

import BottomModal from '../BottomModal';
import { BaseModalProps } from '../../../types/ui';
import { useTailwind } from 'tailwind-rn';
import AppButton from 'src/components/AppButton';
import AppText from 'src/components/AppText';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { paymentsSelectors, paymentsThunks } from 'src/store/slices/payments';
import { Warning } from 'phosphor-react-native';
import useGetColor from 'src/hooks/useColor';
import StorageUsageBar from 'src/components/StorageUsageBar';
import { storageSelectors } from 'src/store/slices/storage';
import storageService from 'src/services/StorageService';

const PlansModal = (props: BaseModalProps) => {
  const [selectedStorage, setSelectedStorage] = useState<string | undefined>(undefined);
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const dispatch = useAppDispatch();
  const pricesBySize = useAppSelector(paymentsSelectors.pricesBySize);
  const { subscription } = useAppSelector((state) => state.payments);

  const suscriptionStorageKey = useMemo(() => {
    let key = undefined;

    if (subscription.type === 'subscription') {
      for (const [k, prices] of Object.entries(pricesBySize)) {
        if (prices.some((p) => p.id === subscription.priceId)) {
          key = k;
          break;
        }
      }
    }

    return key;
  }, [subscription]);
  const { limit } = useAppSelector((state) => state.storage);
  const usage = useAppSelector(storageSelectors.usage);
  const isDowngrading = useMemo(() => {
    return !!selectedStorage && parseInt(selectedStorage) < usage;
  }, [selectedStorage, usage]);
  const onOpen = () => {
    const storageKeys = Object.keys(pricesBySize);
    let storageToSelect = undefined;

    if (subscription.type === 'free') {
      storageToSelect = storageKeys[0];
    } else if (subscription.type === 'subscription') {
      const subscriptionStorageIndex =
        suscriptionStorageKey !== undefined ? storageKeys.indexOf(suscriptionStorageKey) : 0;

      storageToSelect =
        storageKeys[
          subscriptionStorageIndex + 1 > storageKeys.length - 1
            ? subscriptionStorageIndex - 1
            : subscriptionStorageIndex + 1
        ];
    }

    setSelectedStorage(storageToSelect);
  };
  const onClosed = () => {
    props.onClose();
  };
  const onPriceButtonPressed = (priceId: string) => {
    dispatch(paymentsThunks.createSessionThunk(priceId));
  };
  const header = <View style={tailwind('bg-white')}></View>;
  const renderPrices = () =>
    Object.entries(pricesBySize).map(([key], index) => {
      const isTheLast = index === Object.keys(pricesBySize).length - 1;
      const isDisabled = key === suscriptionStorageKey;
      const isSelected = key === selectedStorage;
      const onPress = () => {
        setSelectedStorage(key);
      };

      return (
        <TouchableWithoutFeedback key={key} disabled={isDisabled} onPress={onPress}>
          <View
            style={[
              tailwind('flex-1 p-3 border border-gray-10 rounded-xl'),
              !isTheLast && tailwind('mr-2'),
              isDisabled && tailwind('border-gray-5'),
              isSelected && (isDowngrading ? tailwind('border-red-') : tailwind('border-primary')),
            ]}
          >
            <AppText
              numberOfLines={1}
              style={[
                tailwind('text-center text-gray-100 text-xl'),
                isDisabled && tailwind('text-gray-40'),
                isSelected && (isDowngrading ? tailwind('text-red-') : tailwind('text-primary')),
              ]}
              medium={isSelected}
            >
              {storageService.toString(parseInt(key))}
            </AppText>
          </View>
        </TouchableWithoutFeedback>
      );
    });
  const renderButtons = () => {
    const monthlyPrice = pricesBySize[selectedStorage as string].find((price) => price.interval === 'month');
    const yearlyPrice = pricesBySize[selectedStorage as string].find((price) => price.interval === 'year');
    const monthlyAmount = (monthlyPrice?.amount || 0) * 0.01;
    const yearlyAmount = (yearlyPrice?.amount || 0) * 0.01;

    return (
      <>
        <AppButton
          style={tailwind('flex-1 rounded-xl mr-2')}
          type="accept"
          title={
            <View>
              <AppText style={tailwind('text-center text-lg text-white')} medium>
                {strings.generic.monthly}
              </AppText>
              <AppText style={tailwind('text-center text-sm text-white')}>
                {strings.formatString(strings.generic.pricePerMonth, monthlyAmount)}
              </AppText>
            </View>
          }
          onPress={() => onPriceButtonPressed(monthlyPrice?.id as string)}
          disabled={isDowngrading}
        />
        <AppButton
          style={tailwind('flex-1 rounded-xl')}
          type="accept"
          title={
            <View>
              <AppText style={tailwind('text-center text-lg text-white')} medium>
                {strings.generic.yearly}
              </AppText>
              <AppText style={tailwind('text-center text-sm text-white')}>
                {strings.formatString(strings.generic.pricePerYear, yearlyAmount)}
              </AppText>
            </View>
          }
          onPress={() => onPriceButtonPressed(yearlyPrice?.id as string)}
          disabled={isDowngrading}
        />
      </>
    );
  };

  useEffect(() => {
    props.isOpen && onOpen();
  }, [props.isOpen]);

  return (
    <BottomModal
      isOpen={props.isOpen}
      onClosed={onClosed}
      header={header}
      containerStyle={tailwind('pb-6 px-5')}
      headerStyle={tailwind('bg-white')}
    >
      <View pointerEvents="none" style={tailwind('-mt-10 mb-16')}>
        <View style={tailwind('mb-1.5 p-4 items-center')}>
          <Image source={require('../../../../assets/icon.png')} style={tailwind('rounded-xl w-16 h-16')} />
        </View>
        <AppText style={tailwind('text-center text-2xl mb-1.5')} medium>
          {strings.modals.Plans.title}
        </AppText>
        <AppText style={tailwind('text-center text-gray-60')}>{strings.modals.Plans.advice}</AppText>
      </View>

      <View>
        <AppText style={tailwind('text-center text-xs mb-3')} semibold>
          {strings.modals.Plans.howMuchStorage.toUpperCase()}
        </AppText>
        <View style={tailwind('flex-row')}>{renderPrices()}</View>
      </View>

      {isDowngrading ? (
        <View>
          <View style={tailwind('mt-3 p-3 rounded-lg bg-red-/5 flex-row')}>
            <Warning weight="fill" color={getColor('text-red-')} size={20} style={tailwind('mt-0.5 mr-3')} />
            <AppText style={tailwind('text-sm flex-1 text-red-')}>
              {strings.formatString(
                strings.modals.Plans.freeUpSpace,
                storageService.toString(usage),
                storageService.toString(limit),
              )}
            </AppText>
          </View>
          <StorageUsageBar style={tailwind('mt-3')} />
        </View>
      ) : (
        <></>
      )}

      {selectedStorage ? <View style={tailwind('mt-6 flex-row')}>{renderButtons()}</View> : <></>}

      <View style={tailwind('mt-6')}>
        <AppText style={tailwind('text-center text-sm mb-0.5')} semibold>
          {strings.modals.Plans.moneyBack}
        </AppText>
        <AppText style={tailwind('text-center text-sm mb-3')} semibold>
          {strings.modals.Plans.cancelAtAnyMoment}
        </AppText>
        <AppText style={tailwind('text-xs text-gray-40 text-center')}>{strings.modals.Plans.subscriptionRenew}</AppText>
      </View>
    </BottomModal>
  );
};

export default PlansModal;
