import React, { useEffect, useState } from 'react';
import prettysize from 'prettysize';
import { View, Text, TouchableHighlight } from 'react-native';
import { connect } from 'react-redux';
import { Reducers } from '../../store/reducers/reducers';
import strings from '../../../assets/lang/strings';
import AppMenu from '../../components/AppMenu';
import { tailwind } from '../../helpers/designSystem';
import ProgressBar from '../../components/ProgressBar';
import { getCurrentIndividualPlan } from '../../services/payments';
import { notify } from '../../helpers';
import * as Unicons from '@iconscout/react-native-unicons';
import { loadValues } from '../../services/storage';

interface StorageProps extends Reducers {
  currentPlan: number;
}

interface CurrentPlan {
  name: string;
  storageLimit: number;
}

function Storage(props: StorageProps): JSX.Element {
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
      .catch((err) => {
        notify({
          text: 'Cannot load current plan',
          type: 'warn',
        });
      });
  }, []);

  return (
    <View style={tailwind('bg-white h-full')}>
      <AppMenu
        title={strings.screens.storage.title}
        onBackPress={() => props.navigation.goBack()}
        hideNavigation={true}
        hideSortBar={true}
        hideSearch={true}
        lightMode={true}
        centerTitle={true}
        hideOptions={true}
      />
      <View>
        <View style={tailwind('items-center')}>
          <Text style={tailwind('m-2 text-neutral-900 text-base')}>Usage</Text>
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
          <Text style={tailwind('m-2 text-neutral-900 text-base')}>Current plan</Text>
        </View>
      </View>

      <View style={tailwind('mx-6')}>
        <View>
          <Text style={tailwind('uppercase text-neutral-700 font-bold text-xl')}>
            {currentPlan && currentPlan.name}
          </Text>
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

      <TouchableHighlight
        underlayColor="#5291ff"
        style={tailwind('btn btn-primary my-5 mx-5')}
        onPress={() => {
          props.navigation.push('Billing');
        }}
      >
        <Text style={tailwind('text-white text-lg')}>Change plan</Text>
      </TouchableHighlight>
    </View>
  );
}

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(Storage);
