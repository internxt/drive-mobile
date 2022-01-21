import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Text,
  TouchableHighlight,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import _ from 'lodash';
import * as Unicons from '@iconscout/react-native-unicons';
import { useNavigation } from '@react-navigation/native';
import { NavigationStackProp } from 'react-navigation-stack';

import { notify } from '../../services/toast';
import { getColor, tailwind } from '../../helpers/designSystem';
import Separator from '../../components/Separator';
import { getHeaders } from '../../helpers/headers';
import { getDevelopmentPlans, getProductionPlans } from './plansinfo';
import globalStyle from '../../styles/global.style';
import strings from '../../../assets/lang/strings';
import ScreenTitle from '../../components/ScreenTitle';
import { AppScreen } from '../../types';
import { useAppDispatch } from '../../store/hooks';
import { paymentsActions } from '../../store/slices/payments';

const intervalToMonth = (intervalName: string, intervalCount: number) => {
  let result = 0;

  if (intervalName === 'month') {
    result = intervalCount;
  } else if (intervalName === 'year') {
    result = intervalCount * 12;
  }

  return result;
};

const getProducts = async () => {
  const products = getProductionPlans();
  const perPlan: any = {};

  products.forEach((product) => {
    if (product.metadata.is_teams) {
      return;
    }

    product.plans.forEach((plan) => {
      if (!perPlan[plan.name]) {
        perPlan[plan.name] = [];
      }

      perPlan[plan.name].push({
        name: plan.name,
        id: plan.id,
        productName: product.metadata.simple_name,
        price: plan.price / 100,
        pricePerMonth: plan.price / 100 / intervalToMonth(plan.interval, plan.interval_count),
        interval: plan.interval_count,
      });
    });
  });

  return perPlan;
};

const PERIODS = [
  { index: 0, text: 'Monthly' },
  { index: 1, text: 'Annually' },
  { index: 2, text: 'Lifetime' },
];

function Billing(): JSX.Element {
  const navigation = useNavigation<NavigationStackProp>();
  const dispatch = useAppDispatch();
  const getLinkOneTimePayment = async (plan: any) => {
    const body = {
      test: process.env.NODE_ENV !== 'production',
      // eslint-disable-next-line camelcase
      lifetime_tier: plan.tier,
      mode: 'payment',
      priceId: plan.id,
      successUrl: 'https://drive.internxt.com/redirect/android',
      canceledUrl: 'https://drive.internxt.com/redirect/android',
    };

    return fetch(`${process.env.REACT_NATIVE_DRIVE_API_URL}/api/v2/stripe/session`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(body),
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.error) {
          throw Error(result.error);
        }
        const link = `${process.env.REACT_NATIVE_DRIVE_API_URL}/checkout/${result.id}`;

        Linking.openURL(link);
      })
      .catch((err) => {
        Alert.alert('There has been an error', `${err.message}, please contact us.`, [
          {
            text: 'Go back',
            onPress: () => navigation.replace(AppScreen.Billing),
          },
        ]);
      });
  };

  const getLink = async (plan: any) => {
    if (plan.interval === 0) {
      // Only for Lifetimes
      return getLinkOneTimePayment(plan);
    }
    const body = {
      plan: plan.id,
      test: process.env.NODE_ENV === 'development',
      SUCCESS_URL: 'https://drive.internxt.com/redirect/android',
      CANCELED_URL: 'https://drive.internxt.com/redirect/android',
      isMobile: true,
    };

    fetch(
      `${process.env.REACT_NATIVE_DRIVE_API_URL}/api/stripe/session${
        process.env.NODE_ENV === 'development' ? '?test=true' : ''
      }`,
      {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify(body),
      },
    )
      .then((result) => result.json())
      .then((result) => {
        if (result.error) {
          throw Error(result.error);
        }

        const sessionId = result.id;
        dispatch(paymentsActions.setSessionId(sessionId));

        const link = `${process.env.REACT_NATIVE_DRIVE_API_URL}/checkout/${sessionId}`;

        return Linking.openURL(link);
      })
      .catch((err) => {
        Alert.alert('There has been an error', `${err.message}, please contact us.`, [
          {
            text: 'Go back',
            onPress: () => navigation.replace(AppScreen.Billing),
          },
        ]);
      });
  };

  const [stripeProducts, setStripeProducts] = useState<any>();
  const [selectedProductIndex, setSelectedProductIndex] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<any>();
  const [selectedTab, setSelectedTab] = useState(1);

  useEffect(() => {
    getProducts()
      .then((products: any) => {
        setStripeProducts(products);
      })
      .catch((err) => {
        notify({
          type: 'warn',
          text: 'Cannot load products: ' + err.message,
        });
      });
  }, []);

  useEffect(() => {
    const keys = _.keys(stripeProducts);
    const key = keys[selectedProductIndex];

    if (selectedProductIndex === 2) {
      const isTest = process.env.NODE_ENV !== 'production';

      const lifetimes = [
        {
          tier: 'lifetime',
          price: 0,
          name: 'one-time payment',
          pricePerMonth: 99,
          productName: '1TB',
          interval: 0,
          id: isTest ? 'price_1JZBJVFAOdcgaBMQPDjuJsEh' : 'price_1JiFXDFAOdcgaBMQWwxbraL4',
        },
        {
          tier: 'exclusive-lifetime',
          price: 0,
          name: 'one-time payment',
          pricePerMonth: 299,
          productName: '5TB',
          interval: 0,
          id: isTest ? 'price_1JZBJVFAOdcgaBMQPDjuJsEh' : 'price_1HrovfFAOdcgaBMQP33yyJdt',
        },
        {
          tier: 'infinite',
          price: 0,
          name: 'one-time payment',
          pricePerMonth: 499,
          productName: '10TB',
          interval: 0,
          id: isTest ? 'price_1JZYmRFAOdcgaBMQfADnPmSf' : 'price_1IMA0AFAOdcgaBMQiZyoSIYU',
        },
      ];

      setSelectedProduct(lifetimes);
      return;
    }

    stripeProducts && setSelectedProduct(stripeProducts[key]);
  }, [stripeProducts, selectedProductIndex]);

  return (
    <View style={tailwind('app-screen flex-1 bg-white')}>
      <ScreenTitle text={strings.screens.billing.title} centerText onBackButtonPressed={() => navigation.goBack()} />

      <View style={tailwind('flex-1 mx-4 justify-start')}>
        {/* Buttons inside this fragment does not work inside a separated component */}
        <View style={tailwind('flex-row p-1 mt-8 mb-2 justify-between bg-neutral-20 rounded-xl')}>
          {PERIODS.map((tab, n) => {
            const isTabSelected = n === selectedTab;

            return (
              <View key={n} style={tailwind('flex-1')}>
                <TouchableWithoutFeedback
                  onPress={() => {
                    setSelectedTab(n);
                    setSelectedProductIndex(n);
                  }}
                >
                  <View style={[tailwind('p-2 items-center rounded-xl'), isTabSelected && tailwind('bg-white')]}>
                    <Text
                      style={[
                        tailwind('text-sm px-1 text-neutral-80'),
                        globalStyle.fontWeight.medium,
                        isTabSelected && tailwind('text-neutral-700'),
                      ]}
                    >
                      {tab.text}
                    </Text>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            );
          })}
        </View>

        {(selectedProduct &&
          _.map(selectedProduct, (plan, nPlan) => {
            return (
              <View key={nPlan} style={tailwind('flex-row my-6 ml-3')}>
                <View style={tailwind('flex-col flex-grow justify-end')}>
                  <View>
                    <Text style={[tailwind('text-3xl text-header'), globalStyle.fontWeight.medium]}>
                      {plan.productName}
                    </Text>
                  </View>
                  <View>
                    <Text style={tailwind('text-base text-neutral-100')}>
                      {selectedProductIndex === 2
                        ? 'One-time payment'
                        : `€${plan.price.toFixed(2)} billed ${plan.name.toLowerCase()}`}
                    </Text>
                  </View>
                </View>
                <View style={tailwind('justify-center')}>
                  <TouchableHighlight
                    underlayColor={getColor('blue-70')}
                    style={tailwind('bg-blue-60 rounded-xl h-10 justify-center')}
                    onPress={() => {
                      getLink(plan);
                    }}
                  >
                    <Text style={[tailwind('btn-label mx-4'), globalStyle.fontWeight.medium]}>
                      €{plan.pricePerMonth.toFixed(selectedProductIndex !== 2 ? 2 : 0)}
                      {selectedProductIndex !== 2 && ' / month'}
                    </Text>
                  </TouchableHighlight>
                </View>
              </View>
            );
          })) || <ActivityIndicator color="#5291ff" size={20} />}

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
    </View>
  );
}

export default Billing;
