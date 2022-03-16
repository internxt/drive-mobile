import React from 'react';
import prettysize from 'prettysize';
import { View, Text, TouchableHighlight } from 'react-native';
import * as Unicons from '@iconscout/react-native-unicons';
import { useNavigation } from '@react-navigation/native';
import { NavigationStackProp } from 'react-navigation-stack';
import strings from '../../../assets/lang/strings';
import { getColor, tailwind } from '../../helpers/designSystem';
import ProgressBar from '../../components/ProgressBar';
import ScreenTitle from '../../components/ScreenTitle';
import { useAppSelector } from '../../store/hooks';
import { AppScreenKey, INFINITE_PLAN } from '../../types';
import ReferralsWidget from '../../components/ReferralsWidget';
import globalStyle from '../../styles/global.style';
import AppScreen from '../../components/AppScreen';

interface StorageScreenProps {
  currentPlan: number;
}

function StorageScreen(props: StorageScreenProps): JSX.Element {
  const { usage: photosUsage } = useAppSelector((state) => state.photos);
  const { usage: storageUsage, limit } = useAppSelector((state) => state.storage);
  const navigation = useNavigation<NavigationStackProp>();
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

  return (
    <AppScreen safeAreaTop style={tailwind('h-full')} backgroundColor={getColor('neutral-20')}>
      <ScreenTitle
        textStyle={tailwind('text-2xl')}
        text={strings.screens.storage.title}
        centerText
        onBackButtonPressed={() => navigation.goBack()}
      />

      {/* USAGE */}
      <View style={tailwind('mt-6 mx-5 bg-white rounded-xl bg-white')}>
        <View style={tailwind('px-5 pt-3')}>
          <Text style={{ ...tailwind('text-base text-neutral-500'), ...globalStyle.fontWeight.semibold }}>
            {strings.screens.storage.space.used.used} {getUsageString()} {strings.screens.storage.space.used.of}{' '}
            {getLimitString()}
          </Text>
          <View style={tailwind('my-2')}>
            <ProgressBar
              {...props}
              styleProgress={tailwind('h-2')}
              totalValue={usageValues.limit}
              usedValue={usageValues.usage}
            />
          </View>
        </View>

        {
          <TouchableHighlight
            underlayColor={getColor('neutral-30')}
            onPress={() => {
              navigation.push(AppScreenKey.Billing);
            }}
          >
            <View style={tailwind('px-5 py-3 flex-row justify-between border-t border-neutral-20')}>
              <Text style={{ ...tailwind('text-blue-60 text-lg'), ...globalStyle.fontWeight.semibold }}>
                {strings.components.buttons.upgradeNow}
              </Text>
              <Unicons.UilAngleRight size={30} color={getColor('blue-60')} />
            </View>
          </TouchableHighlight>
        }
      </View>

      <ReferralsWidget />
    </AppScreen>
  );
}

export default StorageScreen;
