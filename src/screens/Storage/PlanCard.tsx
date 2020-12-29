import React, { useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient';
import { TouchableOpacity } from 'react-native-gesture-handler';

export interface PlanCardProps {
    plan: Record<string, unknown>
}

const PlanCard = (props: PlanCardProps) => {

    const formatSize = (gb: number) => {
        const sizes = [ 'GB', 'TB']

        if (gb === 0) return 'N/A'

        const i = Math.floor( Math.log(gb) / Math.log(1000) )

        if (i === 0) return gb + ' ' + sizes[i]

        return ( gb / Math.pow(1000, i) ).toFixed(0) + ' ' + sizes[i]
    }

    const isEmpty = (object: Record<string, unknown>) => { for(let i in object) { return false; } return true; }

    useEffect(() => {
        console.log(props.plan)
    }, [])

    return ( 
        <View style={styles.planContainer}>
            <LinearGradient
                start={[0.05, 0.95]}
                end={[1, 0.95]}
                colors={['#096dff', '#00b1ff']}
                style={{ borderRadius: 4 }}
            >
                <View style={styles.circleGradient}>
                    <Text style={styles.text}>
                        {formatSize(props.plan.size)}
                    </Text>
                </View>
            </LinearGradient>

            <View style={styles.priceContainer}>
                {
                    isEmpty(props.plan.prices) ? 
                        <Text style={styles.text}>
                            Free
                        </Text>
                    :
                    <View style={styles.priceBackground}>
                        <Text style={styles.price}>€{props.plan.prices['month']}</Text>
                        
                        <Text style={[styles.price, styles.grey]}>/month</Text>
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