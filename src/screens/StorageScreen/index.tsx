import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import GestureRecognizer from 'react-native-swipe-gestures';

import strings from '../../../assets/lang/strings';
import AppProgressBar from '../../components/AppProgressBar';
import AppScreenTitle from '../../components/AppScreenTitle';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { INFINITE_PLAN } from '../../types';
import ReferralsWidget from '../../components/ReferralsWidget';
import AppScreen from '../../components/AppScreen';
import { SettingsScreenProps } from '../../types/navigation';
import { useTailwind } from 'tailwind-rn';
import AppText from '../../components/AppText';
import useGetColor from '../../hooks/useColor';
import { uiActions } from 'src/store/slices/ui';
import SettingsGroup from 'src/components/SettingsGroup';
import storageService from 'src/services/StorageService';
import { storageSelectors } from 'src/store/slices/storage';
import AppButton from 'src/components/AppButton';
import { paymentsSelectors } from 'src/store/slices/payments';

function StorageScreen({ navigation }: SettingsScreenProps<'Storage'>): JSX.Element {
  const [currentStatusStep, setCurrentStatusStep] = useState(0);
  const { limit } = useAppSelector((state) => state.storage);

  const hasPaidPlan = useAppSelector(paymentsSelectors.hasPaidPlan);
  const showBilling = useAppSelector(paymentsSelectors.shouldShowBilling);
  const usage = useAppSelector(storageSelectors.usage);
  const availableStorage = useAppSelector(storageSelectors.availableStorage);
  const usagePercent = useAppSelector(storageSelectors.usagePercent);
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const dispatch = useAppDispatch();
  const getLimitString = () => {
    if (limit === 0) {
      return '...';
    }

    if (limit >= INFINITE_PLAN) {
      return '\u221E';
    }

    return storageService.toString(limit);
  };
  const onBackButtonPressed = () => navigation.goBack();
  const onUpgradePressed = () => {
    dispatch(uiActions.setIsPlansModalOpen(true));
  };
  const statusSteps = [
    () => (
      <>
        <AppText style={tailwind('text-lg text-center')}>{strings.generic.used}</AppText>
        <AppText style={tailwind('text-5xl text-center')}>{storageService.toString(usage)}</AppText>
        <AppText style={tailwind('text-lg text-center')}>
          {strings.formatString(strings.generic.ofN, storageService.toString(limit))}
        </AppText>
      </>
    ),
    () => (
      <>
        <AppText style={tailwind('text-lg text-center')}>{strings.generic.avaiblable}</AppText>
        <AppText style={tailwind('text-5xl text-center')}>{storageService.toString(availableStorage)}</AppText>
        <AppText style={tailwind('text-lg text-center')}>
          {strings.formatString(strings.generic.ofN, storageService.toString(limit))}
        </AppText>
      </>
    ),
  ];
  const renderStatusStep = statusSteps[currentStatusStep];
  const onStatusSwipeLeft = () => {
    setCurrentStatusStep(currentStatusStep - 1 < 0 ? statusSteps.length - 1 : currentStatusStep - 1);
  };

  const onStatusSwipeRight = () => {
    setCurrentStatusStep(currentStatusStep + 1 > statusSteps.length - 1 ? 0 : currentStatusStep + 1);
  };

  return (
    <AppScreen safeAreaTop safeAreaColor={getColor('text-white')} style={tailwind('flex-1 bg-gray-5')}>
      <AppScreenTitle
        text={strings.screens.StorageScreen.title}
        containerStyle={tailwind('bg-white')}
        centerText
        onBackButtonPressed={onBackButtonPressed}
      />

      <ScrollView style={tailwind('flex-1')}>
        <View style={tailwind('pb-10 px-4 bg-gray-5')}>
          {/* STATUS */}
          <GestureRecognizer
            onSwipeLeft={onStatusSwipeLeft}
            onSwipeRight={onStatusSwipeRight}
            config={{
              velocityThreshold: 0.3,
              directionalOffsetThreshold: 80,
            }}
          >
            <View style={tailwind('my-8')}>
              {renderStatusStep()}
              <View style={tailwind('mt-2 flex-row justify-center ')}>
                {statusSteps.map((step, index) => (
                  <View
                    key={index}
                    style={[
                      tailwind('rounded-full w-1 h-1'),
                      index === currentStatusStep ? tailwind('bg-gray-80') : tailwind('bg-gray-30'),
                      index !== statusSteps.length - 1 && tailwind('mr-1'),
                    ]}
                  />
                ))}
              </View>
            </View>
          </GestureRecognizer>

          {/* USAGE */}
          <SettingsGroup
            title={strings.screens.StorageScreen.usage}
            items={[
              {
                key: 'usage',
                template: (
                  <View style={tailwind('p-5')}>
                    <View>
                      <View style={tailwind('flex-row justify-between')}>
                        <AppText style={tailwind('text-lg')}>
                          {strings.screens.StorageScreen.space.used.used} {storageService.toString(usage)}{' '}
                          {strings.screens.StorageScreen.space.used.of} {getLimitString()}
                        </AppText>
                        <AppText style={tailwind('text-lg text-gray-40')}>{`${usagePercent}%`}</AppText>
                      </View>

                      <View style={tailwind('my-3')}>
                        <AppProgressBar height={12} totalValue={limit} currentValue={usage} />
                      </View>
                    </View>

                    {showBilling &&
                      (hasPaidPlan ? (
                        <AppButton
                          style={tailwind('mt-3')}
                          type="accept-2"
                          onPress={onUpgradePressed}
                          title={strings.buttons.changePlan}
                        />
                      ) : (
                        <AppButton
                          style={tailwind('mt-3')}
                          type="accept"
                          onPress={onUpgradePressed}
                          title={strings.buttons.upgrade}
                        />
                      ))}
                  </View>
                ),
              },
            ]}
          />

          {!hasPaidPlan ? <ReferralsWidget /> : null}
        </View>
      </ScrollView>
    </AppScreen>
  );
}

export default StorageScreen;
