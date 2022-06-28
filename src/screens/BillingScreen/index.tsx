import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, TouchableHighlight, TouchableWithoutFeedback, View } from 'react-native';
import _ from 'lodash';
import * as Linking from 'expo-linking';

import Separator from '../../components/AppSeparator';
import { getDevelopmentPlans, getProductionPlans } from './plansinfo';
import strings from '../../../assets/lang/strings';
import ScreenTitle from '../../components/AppScreenTitle';
import paymentService from '../../services/PaymentService';
import { NotificationType } from '../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { constants } from '../../services/AppService';
import AppScreen from '../../components/AppScreen';
import notificationsService from '../../services/NotificationsService';
import { Check } from 'phosphor-react-native';
import { RootStackScreenProps } from '../../types/navigation';
import { useTailwind } from 'tailwind-rn';
import AppText from '../../components/AppText';
import useGetColor from '../../hooks/useColor';

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

function BillingScreen({ navigation }: RootStackScreenProps<'Billing'>): JSX.Element {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const redirectUrl = `${constants.REACT_NATIVE_WEB_CLIENT_URL}/redirect-to-app?path=checkout`;
  const getLink = async (plan: { id: string }) => {
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
              text: strings.buttons.back,
              onPress: () => navigation.replace('Billing'),
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
      .then((products) => {
        setStripeProducts(products);
      })
      .catch((err) => {
        notificationsService.show({
          type: NotificationType.Warning,
          text1: strings.formatString(strings.errors.loadProducts, err.message) as string,
        });
      });
  }, []);

  useEffect(() => {
    const keys = _.keys(stripeProducts);
    const key = keys[selectedProductIndex];

    stripeProducts && setSelectedProduct(stripeProducts[key]);
  }, [stripeProducts, selectedProductIndex]);

  return (
    <AppScreen safeAreaTop style={tailwind('flex-1')}>
      <ScreenTitle
        textStyle={tailwind('text-2xl')}
        text={strings.screens.billing.title}
        centerText
        onBackButtonPressed={() => navigation.goBack()}
      />

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
                    <AppText
                      medium
                      style={[tailwind('text-sm px-1 text-neutral-80'), isTabSelected && tailwind('text-neutral-700')]}
                    >
                      {tab.text}
                    </AppText>
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
                    <AppText style={tailwind('text-3xl')} medium>
                      {plan.productName}
                    </AppText>
                  </View>
                  <View>
                    <AppText style={tailwind('text-neutral-100')}>
                      {selectedProductIndex === 2
                        ? 'One-time payment'
                        : strings.formatString(
                            strings.screens.billing.billedEachPeriod,
                            plan.price.toFixed(2),
                            plan.name.toLowerCase(),
                          )}
                    </AppText>
                  </View>
                </View>
                <View style={tailwind('justify-center')}>
                  <TouchableHighlight
                    underlayColor={getColor('text-blue-70')}
                    style={tailwind('bg-blue-60 rounded-xl h-10 justify-center')}
                    onPress={() => {
                      getLink(plan);
                    }}
                  >
                    <AppText style={tailwind('text-white mx-4')} medium>
                      €{plan.pricePerMonth.toFixed(selectedProductIndex !== 2 ? 2 : 0)}
                      {selectedProductIndex !== 2 && ' / ' + strings.screens.storage.plans.month}
                    </AppText>
                  </TouchableHighlight>
                </View>
              </View>
            );
          })) || <ActivityIndicator color="#5291ff" size={20} />}

        <Separator style={tailwind('my-10')} />

        <View>
          <View style={tailwind('flex-row items-center')}>
            <Check color="#42526E" />
            <AppText style={tailwind('ml-1 text-neutral-500 font-bold flex-1')}>
              {strings.screens.billing.features.guarantee}
            </AppText>
          </View>
          <View style={tailwind('flex-row items-center')}>
            <Check color="#42526E" />
            <AppText style={tailwind('ml-1 text-neutral-500')}>{strings.screens.billing.features.share}</AppText>
          </View>
          <View style={tailwind('flex-row items-center')}>
            <Check color="#42526E" />
            <AppText style={tailwind('ml-1 text-neutral-500')}>{strings.screens.billing.features.anyDevice}</AppText>
          </View>
        </View>
      </View>
    </AppScreen>
  );
}

export default BillingScreen;
