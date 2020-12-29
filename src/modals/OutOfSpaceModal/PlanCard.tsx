import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient';
import { size } from 'lodash';

export interface PlanCardProps {
    size: number,
    price?: string,
    free?: boolean
}

const PlanCard = (props: PlanCardProps) => {

    const formatSize = (gb: number) => {
        const sizes = [ 'GB', 'TB']

        if (gb === 0) return 'N/A'

        const i = Math.floor( Math.log(gb) / Math.log(1000) )

        if (i === 0) return gb + ' ' + sizes[i]

        return ( gb / Math.pow(1000, i) ).toFixed(0) + ' ' + sizes[i]
    }

    return ( 
        <View style={styles.plan_container}>
            <LinearGradient
                start={[0.05, 0.95]}
                end={[1, 0.95]}
                colors={['#096dff', '#00b1ff']}
                style={{ borderRadius: 4 }}
            >
                <View style={styles.circleGradient}>
                    <Text style={styles.text}>
                        {formatSize(props.size)}
                    </Text>
                </View>
            </LinearGradient>

            <View style={styles.price_container}>
                {
                    props.free ? 
                        <Text style={styles.text}>
                            Free
                        </Text>
                    :
                    <View style={styles.price_background}>
                        <Text style={styles.price}>€{props.price}</Text>
                        
                        <Text style={[styles.price, styles.grey]}>/month</Text>
                    </View>
                }
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    plan_container: {
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

    price_container: {
        justifyContent: 'center',
        marginLeft: 20
    },

    price_background: {
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