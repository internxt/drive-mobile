import React, { useEffect, useState } from 'react';
import prettysize from 'prettysize';
import { View, Text, StyleSheet, Image, ActivityIndicator, Platform, BackHandler } from 'react-native';
import { TouchableOpacity, TouchableWithoutFeedback } from 'react-native-gesture-handler';
import { connect } from 'react-redux';
import ProgressBar from '../../components/ProgressBar';
import { getIcon } from '../../helpers/getIcon';
import PlanCard from './PlanCard';
import { LinearGradient } from 'expo-linear-gradient';
import { IPlan, IProduct, storageService } from '../../redux/services';
import { Reducers } from '../../redux/reducers/reducers';
import { loadValues } from '../../modals';
import { SafeAreaView } from 'react-native-safe-area-context';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import strings from '../../../assets/lang/strings';

interface StorageProps extends Reducers {
  dispatch?: any,
  navigation?: any,
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

  // BackHandler
  const backAction = () => {
    if (!chosenProduct) {
      props.navigation.replace('FileExplorer')
    } else {
      setChosenProduct(undefined)
    }
    return true
  }

  useEffect(() => {
    loadValues().then(res => {
      setUsageValues(res)
    }).catch(() => { })

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

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction)

    return () => backHandler.remove()
  }, [chosenProduct])

  return (
    <SafeAreaView style={{ backgroundColor: '#fff' }}>
      <View style={styles.container}>
        <View style={styles.navigatorContainer}>
          <View style={styles.backButton}>
            <TouchableOpacity
              onPress={() => {
                if (props.layoutState.currentApp === 'FileExplorer') {
                  props.navigation.replace('FileExplorer')
                } else {
                  props.navigation.replace('Photos')
                }
              }}
              style={styles.backTouchable}
            >
              <Image style={styles.backIcon} source={getIcon('back')} />
            </TouchableOpacity>
          </View>

          <Text style={styles.backText}>{strings.screens.storage.title}</Text>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.firstRow}>
            <Text style={styles.progressTitle}>{strings.screens.storage.space.title}</Text>

            <View style={styles.usedSapceContainer}>
              <Text style={styles.usedSpace}>{strings.screens.storage.space.used.used} </Text>
              <Text style={[styles.usedSpace, styles.bold]}>{prettysize(usageValues.usage)} </Text>
              <Text style={styles.usedSpace}>{strings.screens.storage.space.used.of} </Text>
              <Text style={[styles.usedSpace, styles.bold]}>{prettysize(usageValues.limit)}</Text>
            </View>
          </View>

          <ProgressBar
            styleBar={{}}
            styleProgress={{ height: 7 }}
            totalValue={usageValues.limit}
            usedValue={usageValues.usage}
          />

          <View style={styles.secondRow}>
            <View style={styles.legend}>
              {
                Platform.OS === 'ios' ?
                  <View style={[styles.circle, styles.blue]}></View>
                  :
                  <LinearGradient
                    colors={['#00b1ff', '#096dff']}
                    start={[0, 0.18]}
                    end={[0.18, 1]}

                    style={styles.circle} />
              }

              <Text style={styles.secondRowText}>{strings.screens.storage.space.legend.used} </Text>
            </View>

            <View style={styles.legend}>
              <View style={styles.circle}></View>
              <Text style={styles.secondRowText}>{strings.screens.storage.space.legend.unused}</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardsContainer}>
          {
            !isLoading ?
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
                      <PlanCard currentPlan={prettysize(usageValues.limit)} product={product} size={product.metadata.simple_name} price={product.metadata.price_eur} />
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
              :
              <View>
                <ActivityIndicator color={'gray'} />
              </View>
          }
          <View>
            <Text style={styles.footer}>{strings.screens.storage.plans.current_plan} {prettysize(usageValues.limit)} {strings.getLanguage() === 'es' ? null : 'plan'}</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backButton: {
    flex: 0.1
  },
  backIcon: {
    height: 14,
    width: 9
  },
  backText: {
    color: 'black',
    flex: 0.8,
    fontFamily: 'CerebriSans-Medium',
    fontSize: 16,
    textAlign: 'center'
  },
  backTouchable: {
    alignItems: 'center',
    height: wp('10'),
    justifyContent: 'center',
    width: wp('10')
  },
  blue: {
    backgroundColor: '#096dff'
  },
  bold: {
    fontFamily: 'CerebriSans-Bold'
  },
  cardsContainer: {
    flexGrow: 1,
    marginLeft: 20,
    paddingTop: 20
  },
  circle: {
    backgroundColor: '#ededed',
    borderRadius: 100,
    height: 16,
    marginRight: 6,
    width: 16
  },
  container: {
    backgroundColor: 'white',
    height: '100%',
    justifyContent: 'flex-start'
  },
  firstRow: {
    alignItems: 'center',
    flexDirection: 'row'
  },
  footer: {
    color: '#7e848c',
    fontFamily: 'CerebriSans-Regular',
    fontSize: 16,
    letterSpacing: -0.1,
    lineHeight: 22,
    marginLeft: 0,
    marginTop: 20
  },
  legend: {
    alignItems: 'center',
    flexDirection: 'row',
    marginRight: 30
  },
  navigatorContainer: {
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#f2f2f2',
    flexDirection: 'row',
    height: wp('10')
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
  progressContainer: {
    borderBottomWidth: 1,
    borderColor: '#f2f2f2',
    justifyContent: 'center',
    paddingBottom: 45,
    paddingTop: 30
  },
  progressTitle: {
    color: 'black',
    flex: 0.5,
    fontFamily: 'CerebriSans-Bold',
    fontSize: 18,
    paddingLeft: 20
  },
  secondRow: {
    flexDirection: 'row',
    marginLeft: 20
  },
  secondRowText: {
    color: '#7e848c',
    fontFamily: 'CerebriSans-Regular',
    fontSize: 13
  },
  title: {
    color: 'black',
    fontFamily: 'CerebriSans-Bold',
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
    fontFamily: 'CerebriSans-Medium',
    fontSize: 18,
    paddingBottom: Platform.OS === 'android' ? wp('1') : 0,
    paddingLeft: 10
  },
  usedSapceContainer: {
    flexDirection: 'row',
    flex: 0.5,
    justifyContent: 'flex-end',
    paddingRight: 20
  },
  usedSpace: {
    color: 'black',
    fontFamily: 'CerebriSans-Regular',
    fontSize: 13
  }
})

const mapStateToProps = (state: any) => {
  return { ...state }
};

export default connect(mapStateToProps)(Storage)