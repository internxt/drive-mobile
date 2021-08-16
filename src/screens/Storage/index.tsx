import React, { useEffect, useState } from 'react';
import prettysize from 'prettysize';
import {
  View, Text, StyleSheet, Image, ActivityIndicator,
  Platform, TouchableOpacity, TouchableWithoutFeedback
} from 'react-native';
import { connect } from 'react-redux';
import { getIcon } from '../../helpers/getIcon';
import PlanCard from './PlanCard';
import { IPlan, IProduct, storageService } from '../../redux/services';
import { Reducers } from '../../redux/reducers/reducers';
import { loadValues } from '../../modals';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import strings from '../../../assets/lang/strings';
import AppMenu from '../../components/AppMenu';
import { tailwind } from '../../helpers/designSystem';
import ProgressBar from '../../components/ProgressBar';

interface StorageProps extends Reducers {
  currentPlan: number
}

function Storage(props: StorageProps): JSX.Element {
  const [usageValues, setUsageValues] = useState({ usage: 0, limit: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [products, setProducts] = useState<IProduct[]>([])
  const [plans, setPlans] = useState<IPlan[]>([])
  const [chosenProduct, setChosenProduct] = useState<IProduct>()

  const getProducts = async () => {
    const products = await storageService.loadAvailableProducts()

    return products
  }

  const getPlans = async (product: IProduct) => {
    const plans = await storageService.loadAvailablePlans(product.id)

    return plans
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
  }, [])

  useEffect(() => {
    if (chosenProduct) {
      getPlans(chosenProduct).then(res => {
        setPlans(res)
        setIsLoading(false)
      })
    }
  }, [chosenProduct])

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

      <View>
        <View>
          <Text style={[styles.footer, { textAlign: 'center' }]}>
            {strings.screens.storage.plans.current_plan} {parseLimit()} {strings.getLanguage() === 'es' ? null : 'plan'}
          </Text>
        </View>
      </View>

      <View>
        {/*
        <TouchableHighlight
          style={tailwind('btn btn-primary my-5 mx-5')}
          onPress={() => {
            props.navigation.push('Billing')
          }}>
          <Text style={tailwind('text-base btn-label')}>Change plan</Text>
        </TouchableHighlight>
        */ }

      </View>

      <View style={styles.container, { display: 'none' }}>
        <View style={styles.cardsContainer}>
          {
            isLoading ?
              <View>
                <ActivityIndicator color={'gray'} />
              </View>
              :
              !chosenProduct ?
                <View>
                  <View style={styles.titleContainer}>
                    <Text style={styles.title}>{strings.screens.storage.plans.title}</Text>
                  </View>
                  {
                    products && products.map((product: IProduct) => <TouchableWithoutFeedback
                      key={product.id}
                      onPress={async () => {
                        setIsLoading(true)
                        setChosenProduct(product)
                      }}>
                      <PlanCard
                        currentPlan={prettysize(usageValues.limit)}
                        product={product}
                        size={product.metadata.simple_name}
                        price={product.metadata.price_eur} />
                    </TouchableWithoutFeedback>)
                  }
                </View>
                :
                <View>
                  {
                    !isLoading ?
                      <View>
                        <View style={styles.titleContainer}>
                          <TouchableOpacity
                            onPress={() => {
                              setChosenProduct(undefined)
                            }}
                            style={styles.paymentBack}
                          >
                            <Image style={styles.paymentBackIcon} source={getIcon('back')} />
                          </TouchableOpacity>

                          <Text style={styles.title}>{strings.screens.storage.plans.title_2}</Text>

                          <Text style={styles.titlePlan}>{chosenProduct.name}</Text>
                        </View>

                        {
                          plans && plans.map((plan: IPlan) => <TouchableWithoutFeedback
                            key={plan.id}
                            onPress={() => props.navigation.replace('StorageWebView', { plan: plan })}
                          >
                            <PlanCard chosen={true} price={plan.price.toString()} plan={plan} />
                          </TouchableWithoutFeedback>)
                        }
                      </View>
                      :
                      null
                  }
                </View>
          }
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardsContainer: {
    flexGrow: 1,
    paddingTop: 20
  },
  container: {
    height: '100%',
    justifyContent: 'flex-start'
  },
  footer: {
    color: '#7e848c',
    fontFamily: 'NeueEinstellung-Regular',
    fontSize: 16,
    letterSpacing: -0.1,
    lineHeight: 22,
    marginLeft: 0,
    marginTop: 20
  },
  paymentBack: {
    alignItems: 'center',
    height: wp('6'),
    justifyContent: 'center',
    width: wp('6')
  },
  paymentBackIcon: {
    height: 13,
    marginRight: 10,
    width: 8
  },
  title: {
    color: 'black',
    fontFamily: 'NeueEinstellung-Bold',
    fontSize: 18,
    letterSpacing: 0,
    marginRight: 10,
    paddingBottom: Platform.OS === 'android' ? wp('1') : 0,
    textAlignVertical: 'center'
  },
  titleContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 12
  },
  titlePlan: {
    borderColor: '#eaeced',
    borderLeftWidth: 1,
    color: '#7e848c',
    fontFamily: 'NeueEinstellung-Medium',
    fontSize: 18,
    paddingBottom: Platform.OS === 'android' ? wp('1') : 0,
    paddingLeft: 10
  },
  h7: { height: 7 }
})

const mapStateToProps = (state: any) => {
  return { ...state }
};

export default connect(mapStateToProps)(Storage)