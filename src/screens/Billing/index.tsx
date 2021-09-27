import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Text, TouchableHighlight, TouchableWithoutFeedback, View } from 'react-native';
import { connect } from 'react-redux';
import AppMenu from '../../components/AppMenu';
import { notify } from '../../helpers';
import { Reducers } from '../../redux/reducers/reducers';
import { IProduct } from '../../redux/services';
import _ from 'lodash'
import { tailwind } from '../../helpers/designSystem';
import Separator from '../../components/Separator';
import * as Unicons from '@iconscout/react-native-unicons'
import { getHeaders } from '../../helpers/headers';
import { getDevelopmentPlans, getProductionPlans } from './plansinfo';

// TODO: Export to service
const intervalToMonth = (intervalName: string, intervalCount: number) => {
  if (intervalName === 'month') {
    return intervalCount
  }

  if (intervalName === 'year') {
    return intervalCount * 12
  }
}

const getProducts = async () => {
  const products = process.env.NODE_ENV === 'production' ? getProductionPlans() : getDevelopmentPlans()

  const perPlan = {};

  products.forEach(product => {
    if (product.metadata.is_teams) {
      return;
    }

    product.plans.forEach(plan => {
      if (!perPlan[plan.name]) {
        perPlan[plan.name] = []
      }

      perPlan[plan.name].push({
        name: plan.name,
        id: plan.id,
        productName: product.metadata.simple_name,
        price: plan.price / 100,
        pricePerMonth: plan.price / 100 / intervalToMonth(plan.interval, plan.interval_count),
        interval: plan.interval_count
      })
    })
  })

  return perPlan;
}

const PERIODS = [
  { index: 0, text: 'Monthly' },
  { index: 1, text: 'Semiannually' },
  { index: 2, text: 'Annually' }
]

function Billing(props: Reducers) {

  const getLink = async (plan: any) => {
    const body = {
      plan: plan.id,
      test: process.env.NODE_ENV === 'development',
      SUCCESS_URL: 'https://drive.internxt.com/redirect/android',
      CANCELED_URL: 'https://drive.internxt.com/redirect/android',
      isMobile: true
    };

    fetch(`${process.env.REACT_NATIVE_API_URL}/api/stripe/session${(process.env.NODE_ENV === 'development' ? '?test=true' : '')}`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(body)
    }).then(result => result.json()).then(result => {
      if (result.error) {
        throw Error(result.error);
      }
      const link = `${process.env.REACT_NATIVE_API_URL}/checkout/${result.id}`

      Linking.openURL(link);

    }).catch(err => {
      Alert.alert('There has been an error', `${err.message}, please contact us.`, [
        {
          text: 'Go back',
          onPress: () => props.navigation.replace('Billing')
        }
      ])
    });
  }

  const [stripeProducts, setStripeProducts] = useState<IProduct[]>();
  const [selectedProductIndex, setSelectedProductIndex] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<IProduct>();
  const [selectedTab, setSelectedTab] = useState(0)

  useEffect(() => {
    getProducts().then((products) => {
      setStripeProducts(products);
    }).catch(err => {
      notify({
        type: 'warn',
        text: 'Cannot load products: ' + err.message
      })
    })
  }, []);

  useEffect(() => {
    const keys = _.keys(stripeProducts);
    const key = keys[selectedProductIndex];

    stripeProducts && setSelectedProduct(stripeProducts[key])
  }, [stripeProducts, selectedProductIndex])

  return <View style={tailwind('flex-1 bg-white')}>
    <AppMenu
      {...props}
      title="Billing"
      hideSearch={true}
      onBackPress={() => props.navigation.goBack()} />

    <View style={tailwind('flex-1 mx-4 justify-start')}>

      {/* Buttons inside this fragment does not work inside a separated component */}
      <View style={tailwind('flex-row p-1 my-2 justify-between bg-neutral-20 rounded-xl')}>
        {PERIODS.map((tab, n) => {
          const isTabSelected = n === selectedTab

          return <View key={n} style={tailwind('flex-1')}>
            <TouchableWithoutFeedback
              onPress={() => {
                setSelectedTab(n)
                setSelectedProductIndex(n)
              }}>
              <View style={[
                tailwind('p-2 items-center rounded-xl'),
                isTabSelected && tailwind('bg-white')]}>
                <Text style={[
                  tailwind('px-1 text-neutral-100'),
                  {
                    fontFamily: 'NeueEinstellung-Regular'
                  },
                  isTabSelected && {
                    fontFamily: 'NeueEinstellung-Medium'
                  },
                  isTabSelected && tailwind('text-neutral-700')
                ]}>{tab.text}</Text>
              </View>

            </TouchableWithoutFeedback>
          </View>
        })}
      </View>

      {selectedProduct && _.map(selectedProduct, (plan, nPlan) => {
        return <View key={nPlan} style={tailwind('flex-row my-6 ml-3')}>
          <View style={tailwind('flex-col flex-grow justify-end')}>
            <View>
              <Text style={tailwind('text-3xl font-bold text-header')}>{plan.productName}</Text>
            </View>
            <View>
              <Text style={tailwind('text-xs text-neutral-80')}>{`${plan.price.toFixed(2)}€ billed ${plan.name.toLowerCase()}`}</Text>
            </View>
          </View>
          <View style={tailwind('justify-center')}>
            <TouchableHighlight
              underlayColor="#5291ff"
              style={tailwind('bg-blue-60 rounded-xl h-10 justify-center')}
              onPress={() => {
                getLink(plan)
              }}>
              <Text style={tailwind('btn-label mx-4 font-bold')}>{plan.pricePerMonth.toFixed(2)}€ / month</Text>
            </TouchableHighlight>
          </View>
        </View>
      }) || <ActivityIndicator color="#5291ff" size={20} />}

      <Separator style={tailwind('my-10')} />

      <View>
        <View style={tailwind('flex-row items-center')}>
          <Unicons.UilCheck color="#42526E" />
          <Text style={tailwind('text-base btn-label text-neutral-500 font-bold')}>30 days guarantee</Text>
        </View>
        <View style={tailwind('flex-row items-center')}>
          <Unicons.UilCheck color="#42526E" />
          <Text style={tailwind('text-base btn-label text-neutral-500')}>Private and secure file sharing</Text>
        </View>
        <View style={tailwind('flex-row items-center')}>
          <Unicons.UilCheck color="#42526E" />
          <Text style={tailwind('text-base btn-label text-neutral-500')}>Access your files from any device</Text>
        </View>
      </View>

    </View>
  </View>;
}

const mapStateToProps = (state: any) => ({ ...state });

export default connect(mapStateToProps)(Billing);