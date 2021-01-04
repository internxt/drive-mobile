import React from 'react'
import { View, Text, StyleSheet, Image } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient';
import { IPlan, IProduct } from '../../redux/services';
import { getIcon } from '../../helpers/getIcon';

export interface PlanCardProps {
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
      <LinearGradient
        start={[0.05, 0.95]}
        end={[1, 0.95]}
        colors={['#096dff', '#00b1ff']}
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
                €{(parseInt(props.price) / 100).toFixed(2)}
              </Text>
          }
        </View>
      </LinearGradient>

      <View style={styles.priceContainer}>
        {
          !props.chosen ?
            <View style={styles.priceBackground}>
              <Text style={styles.price}>€{props.price}</Text>

              <Text style={[styles.price, styles.grey]}>/month</Text>

              {
                props.currentPlan && props.size ?
                  <View>
                    {
                      props.currentPlan.replace(/\D/g, '') === props.size.replace(/\D/g, '') ?
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
              <Text style={styles.price}>{props.plan && props.plan.name === 'Monthly' ? 'Pay per ' : 'Prepay '}</Text>

              <Text style={[styles.price, styles.grey]}>
                {
                  props.plan && props.plan.name === 'Annually' ?
                    '12 months'
                    :
                    <Text>{props.plan && props.plan.interval_count === 1 ? 'month' : `${props.plan && props.plan.interval_count} months`}</Text>
                }
              </Text>
            </View>
        }
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  planContainer: {
    flexDirection: 'row',
    marginBottom: 20
  },

  circleGradient: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 4,
    margin: 1,
    height: 57,
    width: 94
  },
  text: {
    fontFamily: 'CircularStd-Bold',
    fontSize: 18,
    letterSpacing: -0.43,
    color: 'black'
  },
  priceContainer: {
    justifyContent: 'center',
    marginLeft: 20
  },
  priceBackground: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  price: {
    fontFamily: 'CircularStd-Bold',
    fontSize: 18,
    letterSpacing: -0.13,
    lineHeight: 28.5,
    color: 'black'
  },
  grey: {
    color: '#7e848c'
  },
  borderRadius4: {
    borderRadius: 4
  },
  checkmark: {
    marginLeft: 10,
    width: 15,
    height: 12
  }
})

export default PlanCard;