import React from 'react'
import { View, Text, StyleSheet, Image } from 'react-native'
import { IPlan, IProduct } from '../../redux/services';
import { getIcon } from '../../helpers/getIcon';
import strings from '../../../assets/lang/strings';

interface PlanCardProps {
  size?: string
  price: string
  chosen?: boolean
  plan?: IPlan
  currentPlan?: string
  product?: IProduct
}

function PlanCard(props: PlanCardProps): JSX.Element {
  return (
    <View style={styles.planContainer}>
      <View
        style={styles.borderRadius4}
      >
        <View style={styles.circleGradient}>
          {
            !props.chosen ?
              <Text style={styles.text}>
                {props.size}
              </Text>
              :
              <Text style={styles.text}>
                {'€'}{(parseInt(props.price) / 100).toFixed(2)}
              </Text>
          }
        </View>
      </View>

      <View style={styles.priceContainer}>
        {
          !props.chosen ?
            <View style={styles.priceBackground}>
              <Text style={styles.price}>{'€'}{props.price}</Text>

              <Text style={[styles.price, styles.grey]}>{'/'}{strings.screens.storage.plans.month}</Text>

              {
                props.currentPlan && props.size ?
                  <View>
                    {
                      props.currentPlan.replace(/\s/g, '') === props.size.replace(/\s/g, '') ?
                        <Image style={styles.checkmark} source={getIcon('checkmark')} />
                        :
                        null
                    }
                  </View>
                  :
                  null
              }
            </View>
            :
            <View style={styles.priceBackground}>
              <Text style={styles.price}>{props.plan && props.plan.name === 'Monthly' ? strings.screens.storage.plans.pay : strings.screens.storage.plans.pre_pay} </Text>

              <Text style={[styles.price, styles.grey]}>
                {
                  props.plan && props.plan.name === 'Annually' ?
                    '12 ' + strings.screens.storage.plans.months
                    :
                    <Text>{props.plan && props.plan.interval_count === 1 ? strings.screens.storage.plans.month : `${props.plan && props.plan.interval_count} ${strings.screens.storage.plans.months}`}</Text>
                }
              </Text>
            </View>
        }
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  borderRadius4: {
    borderRadius: 4
  },
  checkmark: {
    height: 12,
    marginLeft: 10,
    width: 15
  },
  circleGradient: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 4,
    height: 57,
    justifyContent: 'center',
    margin: 1,
    width: 94
  },
  grey: {
    color: '#7e848c'
  },
  planContainer: {
    flexDirection: 'row',
    marginBottom: 20
  },
  price: {
    color: 'black',
    fontFamily: 'NeueEinstellung-Bold',
    fontSize: 18,
    letterSpacing: -0.13,
    lineHeight: 28.5
  },
  priceBackground: {
    alignItems: 'center',
    flexDirection: 'row'
  },
  priceContainer: {
    justifyContent: 'center',
    marginLeft: 20
  },
  text: {
    color: 'black',
    fontFamily: 'NeueEinstellung-Bold',
    fontSize: 18,
    letterSpacing: -0.43
  }
})

export default PlanCard;