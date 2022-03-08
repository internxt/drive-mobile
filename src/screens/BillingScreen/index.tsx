import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableHighlight, TouchableWithoutFeedback, View } from 'react-native';
import _ from 'lodash';
import * as Unicons from '@iconscout/react-native-unicons';
import { useNavigation } from '@react-navigation/native';
import { NavigationStackProp } from 'react-navigation-stack';
import * as Linking from 'expo-linking';

import { notify } from '../../services/toast';
import { getColor, tailwind } from '../../helpers/designSystem';
import Separator from '../../components/Separator';
import { getDevelopmentPlans, getProductionPlans } from './plansinfo';
import globalStyle from '../../styles/global.style';
import strings from '../../../assets/lang/strings';
import ScreenTitle from '../../components/ScreenTitle';
import { AppScreen } from '../../types';
import paymentService from '../../services/payment';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { constants } from '../../services/app';

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
  const products = constants.NODE_ENV === 'production' ? getProductionPlans() : getDevelopmentPlans();
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
  { index: 0, text: strings.generic.monthly },
  { index: 1, text: strings.generic.annually },
];

function BillingScreen(): JSX.Element {
  const navigation = useNavigation<NavigationStackProp>();
  const redirectUrl = `${constants.REACT_NATIVE_WEB_CLIENT_URL}/redirect-to-app?path=checkout`;
  const getLink = async (plan: any) => {
    const body = {
      plan: plan.id,
      test: constants.NODE_ENV === 'development',
      successUrl: redirectUrl,
      canceledUrl: redirectUrl,
      isMobile: true,
    };

    const response = await paymentService
      .createSession(body)
      .then((response) => response.json())
      .catch((err) => {
        Alert.alert(
          strings.errors.generic.title,
          strings.formatString(strings.errors.generic.message, err.message) as string,
          [
            {
              text: strings.components.buttons.back,
              onPress: () => navigation.replace(AppScreen.Billing),
            },
          ],
        );
      });

    if (response.error) {
      throw Error(response.error);
    }

    const sessionId = response.id;
    const link = `${constants.REACT_NATIVE_WEB_CLIENT_URL}/checkout/${sessionId}`;

    await AsyncStorage.setItem('tmpCheckoutSessionId', sessionId);

    Linking.openURL(link);
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
            <Text style={tailwind('ml-1 text-base btn-label text-neutral-500 font-bold')}>
              {strings.screens.billing.features.guarantee}
            </Text>
          </View>
          <View style={tailwind('flex-row items-center')}>
            <Unicons.UilCheck color="#42526E" />
            <Text style={tailwind('ml-1 text-base btn-label text-neutral-500')}>
              {strings.screens.billing.features.share}
            </Text>
          </View>
          <View style={tailwind('flex-row items-center')}>
            <Unicons.UilCheck color="#42526E" />
            <Text style={tailwind('ml-1 text-base btn-label text-neutral-500')}>
              {strings.screens.billing.features.anyDevice}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default BillingScreen;
