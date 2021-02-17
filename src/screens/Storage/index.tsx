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

interface StorageProps extends Reducers {
  dispatch?: any,
  navigation?: any,
  currentPlan: number
}

function Storage(props: StorageProps): JSX.Element {
  const userToken = props.authenticationState.token
  const [usageValues, setUsageValues] = useState({ usage: 0, limit: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [products, setProducts] = useState<IProduct[]>([])
  const [plans, setPlans] = useState<IPlan[]>([])
  const [chosenProduct, setChosenProduct] = useState<IProduct>()

  const getProducts = async () => {
    const products = await storageService.loadAvailableProducts(userToken)

    return products
  }

  const getPlans = async (product: IProduct) => {
    const plans = await storageService.loadAvailablePlans(userToken, product.id)

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
                  props.navigation.replace('Home')
                }
              }}
              style={styles.backTouchable}
            >
              <Image style={styles.backIcon} source={getIcon('back')} />
            </TouchableOpacity>
          </View>

          <Text style={styles.backText}>Storage</Text>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.firstRow}>
            <Text style={styles.progressTitle}>Storage Space</Text>

            <View style={styles.usedSapceContainer}>
              <Text style={styles.usedSpace}>Used </Text>
              <Text style={[styles.usedSpace, styles.bold]}>{prettysize(usageValues.usage)} </Text>
              <Text style={styles.usedSpace}>of </Text>
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

              <Text style={styles.secondRowText}>Used space</Text>
            </View>

            <View style={styles.legend}>
              <View style={styles.circle}></View>
              <Text style={styles.secondRowText}>Unused space</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardsContainer}>
          {
            !isLoading ?
              !chosenProduct ?
                <View>
                  <View style={styles.titleContainer}>
                    <Text style={styles.title}>Storage plans</Text>
                  </View>
                  {
                    products && products.map((product: IProduct) => <TouchableWithoutFeedback
                      key={product.id}
                      onPress={async () => {
                        console.log(product)
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

                          <Text style={styles.title}>Payment length</Text>

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
            <Text style={styles.footer}>You are subscribed to the {prettysize(usageValues.limit)} plan</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'flex-start',
    height: '100%',
    backgroundColor: 'white'
  },
  navigatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    height: wp('10'),
    borderColor: '#f2f2f2'
  },
  backButton: {
    flex: 0.1
  },
  backTouchable: {
    width: wp('10'),
    height: wp('10'),
    alignItems: 'center',
    justifyContent: 'center'
  },
  backIcon: {
    height: 14,
    width: 9
  },
  backText: {
    flex: 0.8,
    textAlign: 'center',
    fontFamily: 'CerebriSans-Medium',
    fontSize: 16,
    color: 'black'
  },
  progressContainer: {
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderColor: '#f2f2f2',
    paddingBottom: 45,
    paddingTop: 30
  },
  firstRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  progressTitle: {
    flex: 0.5,
    fontFamily: 'CerebriSans-Bold',
    fontSize: 18,
    color: 'black',
    paddingLeft: 20
  },
  usedSapceContainer: {
    flexDirection: 'row',
    flex: 0.5,
    justifyContent: 'flex-end',
    paddingRight: 20
  },
  usedSpace: {
    fontFamily: 'CerebriSans-Regular',
    color: 'black',
    fontSize: 13
  },
  bold: {
    fontFamily: 'CerebriSans-Bold'
  },
  secondRow: {
    flexDirection: 'row',
    marginLeft: 20
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 30
  },
  circle: {
    width: 16,
    height: 16,
    borderRadius: 100,
    marginRight: 6,
    backgroundColor: '#ededed'
  },
  blue: {
    backgroundColor: '#096dff'
  },
  secondRowText: {
    fontSize: 13,
    fontFamily: 'CerebriSans-Regular',
    color: '#7e848c'
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  paymentBack: {
    height: wp('6'),
    width: wp('6'),
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontFamily: 'CerebriSans-Bold',
    fontSize: 18,
    textAlignVertical: 'center',
    letterSpacing: 0,
    color: 'black',
    marginRight: 10,
    paddingBottom: Platform.OS === 'android' ? wp('1') : 0
  },
  titlePlan: {
    fontFamily: 'CerebriSans-Medium',
    color: '#7e848c',
    fontSize: 18,
    paddingLeft: 10,
    borderLeftWidth: 1,
    borderColor: '#eaeced',
    paddingBottom: Platform.OS === 'android' ? wp('1') : 0
  },
  paymentBackIcon: {
    width: 8,
    height: 13,
    marginRight: 10
  },
  cardsContainer: {
    paddingTop: 20,
    marginLeft: 20,
    flexGrow: 1
  },
  footer: {
    fontFamily: 'CerebriSans-Regular',
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.1,
    marginLeft: 0,
    marginTop: 20,
    color: '#7e848c'
  }
})

const mapStateToProps = (state: any) => {
  return { ...state }
};

export default connect(mapStateToProps)(Storage)