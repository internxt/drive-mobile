import strings from 'assets/lang/strings';
import { ArrowRight } from 'phosphor-react-native';
import prettysize from 'prettysize';
import React from 'react';
import { View } from 'react-native';
import AppButton from 'src/components/AppButton';
import AppText from 'src/components/AppText';
import { getLineHeight } from 'src/styles/global';
import { useTailwind } from 'tailwind-rn';

export interface ConfirmationStepProps {
  currentPlan: {
    limitInBytes: number;
    price: number;
    interval: 'year' | 'month';
  };
  newPlan: {
    limitInBytes: number;
    price: number;
    interval: 'year' | 'month';
  };
  onBack: () => void;
  onConfirm: () => void;
  loading: boolean;
}

export const ConfirmationStep: React.FC<ConfirmationStepProps> = (props) => {
  const tailwind = useTailwind();
  const shadow = {
    shadowColor: '#b8b8b8',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.2,
    shadowRadius: 5.62,
    elevation: 8,
  };
  return (
    <View style={tailwind('px-4')}>
      <View style={tailwind('flex flex-row items-center')}>
        <View
          style={[
            tailwind('border border-gray-10 py-5 rounded-2xl flex-1 justify-center items-center bg-white'),
            shadow,
          ]}
        >
          <View
            style={[
              tailwind(
                'px-2.5 flex items-center justify-center rounded-full bg-gray-5 flex items-center border border-gray-10',
              ),
              { height: 30 },
            ]}
          >
            <AppText medium style={tailwind('text-sm text-gray-80')}>
              {strings.generic.current}
            </AppText>
          </View>
          <AppText semibold style={tailwind('text-primary text-2xl mt-2.5')}>
            {prettysize(props.currentPlan.limitInBytes).replace(' ', '')}
          </AppText>
          <AppText medium style={tailwind('text-gray-80')}>
            €{props.currentPlan.price}/
            {props.currentPlan.interval === 'month'
              ? strings.generic.month.toLowerCase()
              : strings.generic.year.toLowerCase()}
          </AppText>
        </View>
        <View style={tailwind('mx-2')}>
          <ArrowRight weight="bold" color={tailwind('text-gray-30').color as string} size={24} />
        </View>
        <View
          style={[
            tailwind('border border-gray-10 py-5 rounded-2xl flex-1 justify-center items-center bg-white'),
            shadow,
          ]}
        >
          <View
            style={[
              tailwind(
                'px-2.5 flex items-center justify-center rounded-full bg-gray-5 flex items-center border border-gray-10',
              ),
              { height: 30 },
            ]}
          >
            <AppText medium style={tailwind('text-sm text-gray-80')}>
              {strings.generic.new}
            </AppText>
          </View>
          <AppText semibold style={tailwind('text-primary text-2xl mt-2.5')}>
            {prettysize(props.newPlan.limitInBytes).replace(' ', '')}
          </AppText>
          <AppText medium style={tailwind('text-gray-80')}>
            €{props.newPlan.price}/
            {props.newPlan.interval === 'month'
              ? strings.generic.month.toLowerCase()
              : strings.generic.year.toLowerCase()}
          </AppText>
        </View>
      </View>
      {/* Disclaimer */}
      <View style={tailwind('bg-gray-5 p-4 rounded-2xl mt-5')}>
        <AppText style={[tailwind('text-sm text-center text-gray-80'), { lineHeight: getLineHeight(14, 1.2) }]}>
          {strings.messages.planPeriodDisclaimer}
        </AppText>
      </View>
      {/* Confirmation buttons */}
      <View style={tailwind('flex flex-row mt-2.5')}>
        <AppButton onPress={props.onBack} title={strings.buttons.back} style={tailwind('flex-1')} type="white" />
        <View style={tailwind('w-2')}></View>
        <AppButton
          loading={props.loading}
          onPress={props.onConfirm}
          title={strings.buttons.confirm}
          style={tailwind('flex-1')}
          type="accept"
        />
      </View>
    </View>
  );
};
