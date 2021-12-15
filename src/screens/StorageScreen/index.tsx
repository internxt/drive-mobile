import React, { useEffect, useState } from 'react';
import prettysize from 'prettysize';
import { View, Text, TouchableHighlight } from 'react-native';
import * as Unicons from '@iconscout/react-native-unicons';
import { useNavigation } from '@react-navigation/native';
import { NavigationStackProp } from 'react-navigation-stack';
import strings from '../../../assets/lang/strings';
import { tailwind } from '../../helpers/designSystem';
import ProgressBar from '../../components/ProgressBar';
import { getCurrentIndividualPlan } from '../../services/payments';
import { notify } from '../../services/toast';
import { loadValues } from '../../services/storage';
import ScreenTitle from '../../components/ScreenTitle';
import { AppScreen } from '../../types';

interface StorageScreenProps {
  currentPlan: number;
}

interface CurrentPlan {
  name: string;
  storageLimit: number;
}

function StorageScreen(props: StorageScreenProps): JSX.Element {
  const navigation = useNavigation<NavigationStackProp>();
  const [usageValues, setUsageValues] = useState({ usage: 0, limit: 0 });
  const [currentPlan, setCurrentPlan] = useState<CurrentPlan>();

  const parseLimit = () => {
    if (usageValues.limit === 0) {
      return '...';
    }

    const infinitePlan = Math.pow(1024, 4) * 99; // 99TB

    if (usageValues.limit >= infinitePlan) {
      return '\u221E';
    }

    return prettysize(usageValues.limit, true);
  };

  useEffect(() => {
    loadValues()
      .then((res) => setUsageValues(res))
      .catch(() => undefined);

    getCurrentIndividualPlan()
      .then(setCurrentPlan)
      .catch(() => {
        notify({
          text: 'Cannot load current plan',
          type: 'warn',
        });
      });
  }, []);

  return (
    <View style={tailwind('app-screen bg-white h-full')}>
      <ScreenTitle text={strings.screens.storage.title} centerText onBackButtonPressed={() => navigation.goBack()} />
      <View>
        <View style={tailwind('items-center')}>
          <Text style={tailwind('m-2 text-neutral-900 text-base')}>{strings.screens.storage.usage}</Text>
        </View>
        <View style={tailwind('mx-5 px-5 py-3 bg-gray-10 rounded-lg')}>
          <View>
            <Text style={tailwind('text-sm text-neutral-500')}>
              {strings.screens.storage.space.used.used} {prettysize(usageValues.usage)}{' '}
              {strings.screens.storage.space.used.of} {parseLimit()}
            </Text>
          </View>
          <View style={tailwind('my-2')}>
            <ProgressBar
              {...props}
              styleProgress={tailwind('h-2')}
              totalValue={usageValues.limit}
              usedValue={usageValues.usage}
            />
          </View>
        </View>
      </View>

      <View>
        <View style={tailwind('items-center mt-3')}>
          <Text style={tailwind('m-2 text-neutral-900 text-base')}>{strings.screens.storage.currentPlan}</Text>
        </View>
      </View>

      <View style={tailwind('mx-6')}>
        <View>
          <Text style={tailwind('uppercase text-neutral-700 font-bold text-xl')}>{parseLimit()}</Text>
        </View>

        <View style={tailwind('mt-2')}>
          {usageValues.limit !== 0 && (
            <View style={tailwind('flex-row items-center')}>
              <Unicons.UilCheck color="#5291ff" />
              <Text style={tailwind('mx-1')}>Enjoy {parseLimit()} forever</Text>
            </View>
          )}
          <View style={tailwind('flex-row items-center')}>
            <Unicons.UilCheck color="#5291ff" />
            <Text style={tailwind('mx-1')}>Encrypted file storage and sharing</Text>
          </View>
          <View style={tailwind('flex-row items-center')}>
            <Unicons.UilCheck color="#5291ff" />
            <Text style={tailwind('mx-1')}>Access your files from any device</Text>
          </View>
          <View style={tailwind('flex-row items-center')}>
            <Unicons.UilCheck color="#5291ff" />
            <Text style={tailwind('mx-1')}>Get access to all our services</Text>
          </View>
        </View>
      </View>

      {/* <TouchableHighlight
        underlayColor="#5291ff"
        style={tailwind('btn btn-primary my-5 mx-5')}
        onPress={() => {
          navigation.push(AppScreen.Billing)
        }}>

        <Text style={tailwind('text-white text-lg')}>Change plan</Text>
      </TouchableHighlight> */}
    </View>
  );
}

export default StorageScreen;
