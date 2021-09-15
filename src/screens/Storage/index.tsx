import React, { useEffect, useState } from 'react';
import prettysize from 'prettysize';
import {
  View, Text, StyleSheet, TouchableHighlight
} from 'react-native';
import { connect } from 'react-redux';
import { IPlan, IProduct, storageService } from '../../redux/services';
import { Reducers } from '../../redux/reducers/reducers';
import { loadValues } from '../../modals';
import strings from '../../../assets/lang/strings';
import AppMenu from '../../components/AppMenu';
import { tailwind } from '../../helpers/designSystem';
import ProgressBar from '../../components/ProgressBar';
import { getCurrentIndividualPlan } from '../../services/payments';
import { notify } from '../../helpers';
import * as Unicons from '@iconscout/react-native-unicons'

interface StorageProps extends Reducers {
  currentPlan: number
}

interface CurrentPlan {
  name: string
  storageLimit: number
}

function Storage(props: StorageProps): JSX.Element {
  const [usageValues, setUsageValues] = useState({ usage: 0, limit: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [products, setProducts] = useState<IProduct[]>([])
  const [plans, setPlans] = useState<IPlan[]>([])
  const [chosenProduct, setChosenProduct] = useState<IProduct>()

  const [currentPlan, setCurrentPlan] = useState<CurrentPlan>();

  const getProducts = async () => {
    const products = await storageService.loadAvailableProducts()

    return products
  }

  const parseLimit = () => {

    if (usageValues.limit === 0) {
      return '...';
    }

    const infinitePlan = Math.pow(1024, 4) * 99; // 99TB

    if (usageValues.limit >= infinitePlan) {
      return '\u221E';
    }

    return prettysize(usageValues.limit);
  }

  useEffect(() => {
    loadValues().then(res => setUsageValues(res)).catch(() => { })

    getProducts().then((res) => {
      setProducts(res)
      setIsLoading(false)
    })

    getCurrentIndividualPlan().then(setCurrentPlan).catch(err => {
      notify({
        text: 'Cannot load current plan',
        type: 'warn'
      })
    })
  }, [])

  return (
    <View style={[tailwind('bg-white'), { flexGrow: 1 }]}>
      <AppMenu
        title={strings.screens.storage.title}
        onBackPress={() => {
          props.navigation.goBack()
        }}
        hideSearch={true} hideOptions={true} />
      <View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: 'black', margin: 10 }}>Usage</Text>
        </View>
        <View style={[tailwind('mx-5 px-5 py-3'), { backgroundColor: '#F4F5F7', borderRadius: 10 }]}>
          <View>
            <Text style={{ color: '#42526E' }}>{strings.screens.storage.space.used.used} {prettysize(usageValues.usage)} {strings.screens.storage.space.used.of} {parseLimit()}</Text>
          </View>
          <View style={[tailwind('my-2'), {}]}>
            <ProgressBar
              {...props}
              styleProgress={styles.h7}
              totalValue={usageValues.limit}
              usedValue={usageValues.usage}
            />
          </View>
        </View>
      </View>

      <View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: 'black', margin: 10 }}>Current plan</Text>
        </View>
      </View>

      <View style={{ marginHorizontal: 30 }}>
        <View>
          <Text style={{ textTransform: 'uppercase', fontWeight: 'bold', fontSize: 17 }}>{currentPlan && currentPlan.name}</Text>
        </View>

        <View style={tailwind('mt-2')}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Unicons.UilCheck color="#5291ff" />
            <Text style={tailwind('mx-1')}>All available devices</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Unicons.UilCheck color="#5291ff" />
            <Text style={tailwind('mx-1')}>Unlimited devices</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Unicons.UilCheck color="#5291ff" />
            <Text style={tailwind('mx-1')}>Secure file sharing</Text>
          </View>
        </View>
      </View>

      <TouchableHighlight
        underlayColor="#5291ff"
        style={tailwind('btn btn-primary my-5 mx-5')}
        onPress={() => {
          props.navigation.push('Billing')
        }}>

        <Text style={{ color: 'white', fontSize: 17 }}>Change plan</Text>
      </TouchableHighlight>
    </View>
  );
}

const styles = StyleSheet.create({
  h7: { height: 7 }
})

const mapStateToProps = (state: any) => {
  return { ...state }
};

export default connect(mapStateToProps)(Storage)