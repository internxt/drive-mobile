import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient';

export interface PlanCardProps {
    size?: string
    price?: string
    chosen?: boolean
    plan?: Record<string, unknown>
}

const PlanCard = (props: PlanCardProps) => {

    return ( 
        <View style={styles.planContainer}>
            <LinearGradient
                start={[0.05, 0.95]}
                end={[1, 0.95]}
                colors={['#096dff', '#00b1ff']}
                style={{ borderRadius: 4 }}
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
                        </View>
                    :
                        <View style={styles.priceBackground}>
                            <Text style={styles.price}>{props.plan.name === 'Monthly' ? 'Pay per ' : 'Prepay '}</Text>
                            
                            <Text style={[styles.price, styles.grey]}>
                                {
                                    props.plan.name === 'Annually' ? 
                                        '12 months' 
                                    : 
                                        <Text>{props.plan.interval_count === 1 ? 'month' : `${props.plan.interval_count} months`}</Text>
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
        marginBottom: 18
    },

    circleGradient: {
        justifyContent: 'center',
        alignItems: 'center',

        backgroundColor: "white",
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
        flexDirection: 'row'
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
    }
})
 
export default PlanCard;