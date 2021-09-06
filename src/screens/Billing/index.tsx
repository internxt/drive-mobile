import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Text, TouchableHighlight, View } from 'react-native';
import { connect } from 'react-redux';
import AppMenu from '../../components/AppMenu';
import { notify } from '../../helpers';
import { Reducers } from '../../redux/reducers/reducers';
import { IProduct, storageService } from '../../redux/services';
import _ from 'lodash'
import { tailwind } from '../../helpers/designSystem';
import Separator from '../../components/Separator';
import * as Unicons from '@iconscout/react-native-unicons'
import { getHeaders } from '../../helpers/headers';

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
  const products = await storageService.loadAvailableProducts()

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

  return <View style={{ flex: 1, backgroundColor: 'white' }}>
    <AppMenu
      {...props}
      title="Billing"
      hideSearch={true}
      onBackPress={() => props.navigation.goBack()} />

    <View style={{
      flex: 1,
      marginHorizontal: 20,
      justifyContent: 'flex-start'
    }}>

      {/* Buttons inside this fragment does not work inside a separated component */}

      <View style={{
        flexDirection: 'row',
        padding: 3,
        justifyContent: 'space-between',
        backgroundColor: '#F4F5F7',
        borderRadius: 10,
        marginBottom: 15
      }}>
        {PERIODS.map((tab, n) => {
          const isTabSelected = n === selectedTab

          return <View key={n} style={{ flexGrow: 1 }}>
            <TouchableHighlight
              underlayColor="#fff"
              onPress={() => {
                setSelectedTab(n)
                setSelectedProductIndex(n)
              }}>
              <View style={[{
                padding: 10,
                borderRadius: 10,
                alignItems: 'center'
              }, isTabSelected ? {
                backgroundColor: 'white',
                borderColor: '#EBECF0'
              } : {}]}>
                <Text style={[
                  tailwind('px-1'),
                  isTabSelected ? { color: '#000' } : { color: '#7A869A' }
                ]}>{tab.text}</Text>
              </View>

            </TouchableHighlight>
          </View>
        })}
      </View>

      {selectedProduct && _.map(selectedProduct, (plan, nPlan) => {
        return <View key={nPlan} style={{ flexDirection: 'row', marginVertical: 20, marginLeft: 10 }}>
          <View style={{ flexDirection: 'column', flexGrow: 1, justifyContent: 'flex-end' }}>
            <View>
              <Text style={[tailwind('text-3xl font-bold'), { color: '#253858' }]}>{plan.productName}</Text>
            </View>
            <View>
              <Text style={[tailwind('text-xs'), { color: '#97A0AF' }]}>{`${plan.price.toFixed(2)}€ billed ${plan.name.toLowerCase()}`}</Text>
            </View>
          </View>
          <View style={{ justifyContent: 'center' }}>
            <TouchableHighlight
              underlayColor="#5291ff"
              style={tailwind('btn btn-primary')}
              onPress={() => {
                getLink(plan)
              }}>
              <Text style={tailwind('text-base btn-label mx-3 text-xl font-bold')}>{plan.pricePerMonth.toFixed(2)}€ / month</Text>
            </TouchableHighlight>
          </View>
        </View>
      }) || <ActivityIndicator color="#5291ff" size={20} />}

      <Separator style={tailwind('my-10')} />

      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Unicons.UilCheck color="#42526E" />
          <Text style={[tailwind('text-base btn-label'), { color: '#42526E' }]}>30 days guarantee</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Unicons.UilCheck color="#42526E" />
          <Text style={[tailwind('text-base btn-label'), { color: '#42526E' }]}>Private and secure file sharing</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Unicons.UilCheck color="#42526E" />
          <Text style={[tailwind('text-base btn-label'), { color: '#42526E' }]}>Access your files from any device</Text>
        </View>
      </View>

    </View>
  </View>;
}

const mapStateToProps = (state: any) => ({ ...state });

export default connect(mapStateToProps)(Billing);