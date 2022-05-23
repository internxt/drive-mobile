import React from 'react';
import prettysize from 'prettysize';
import { View, Text, TouchableHighlight } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import strings from '../../../assets/lang/strings';
import { getColor, tailwind } from '../../helpers/designSystem';
import AppProgressBar from '../../components/AppProgressBar';
import ScreenTitle from '../../components/AppScreenTitle';
import { useAppSelector } from '../../store/hooks';
import { AppScreenKey, INFINITE_PLAN } from '../../types';
import ReferralsWidget from '../../components/ReferralsWidget';
import globalStyle from '../../styles';
import AppScreen from '../../components/AppScreen';
import { CaretRight } from 'phosphor-react-native';
import appService from '../../services/AppService';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

interface StorageScreenProps {
  currentPlan: number;
}

function StorageScreen(props: StorageScreenProps): JSX.Element {
  const { usage: photosUsage } = useAppSelector((state) => state.photos);
  const { usage: storageUsage, limit } = useAppSelector((state) => state.drive);
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const usageValues = { usage: storageUsage + photosUsage, limit };
  const getLimitString = () => {
    if (usageValues.limit === 0) {
      return '...';
    }

    if (usageValues.limit >= INFINITE_PLAN) {
      return '\u221E';
    }

    return prettysize(usageValues.limit, true);
  };
  const getUsageString = () => prettysize(usageValues.usage);
  const onBackButtonPressed = () => navigation.goBack();

  return (
    <AppScreen safeAreaTop style={tailwind('h-full')} backgroundColor={getColor('neutral-20')}>
      <ScreenTitle
        textStyle={tailwind('text-2xl')}
        text={strings.screens.storage.title}
        centerText
        onBackButtonPressed={onBackButtonPressed}
      />

      {/* USAGE */}
      <View style={tailwind('mt-6 mx-5 bg-white rounded-xl bg-white')}>
        <View
          style={[
            appService.constants.REACT_NATIVE_SHOW_BILLING ? tailwind('pt-3') : tailwind('py-3'),
            tailwind('px-5'),
          ]}
        >
          <Text style={{ ...tailwind('text-base text-neutral-500'), ...globalStyle.fontWeight.semibold }}>
            {strings.screens.storage.space.used.used} {getUsageString()} {strings.screens.storage.space.used.of}{' '}
            {getLimitString()}
          </Text>
          <View style={tailwind('my-2')}>
            <AppProgressBar
              {...props}
              progressStyle={tailwind('h-2')}
              totalValue={usageValues.limit}
              currentValue={usageValues.usage}
            />
          </View>
        </View>

        {appService.constants.REACT_NATIVE_SHOW_BILLING && (
          <TouchableHighlight
            underlayColor={getColor('neutral-30')}
            onPress={() => {
              navigation.push(AppScreenKey.Billing);
            }}
          >
            <View style={tailwind('px-5 py-3 flex-row items-center justify-between border-t border-neutral-20')}>
              <Text style={{ ...tailwind('text-blue-60 text-lg'), ...globalStyle.fontWeight.semibold }}>
                {strings.components.buttons.upgradeNow}
              </Text>
              <CaretRight size={22} color={getColor('blue-60')} weight="bold" />
            </View>
          </TouchableHighlight>
        )}
      </View>

      <ReferralsWidget />
    </AppScreen>
  );
}

export default StorageScreen;
