import React from 'react'
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function ProgressBar(props: any) {
    const { totalValue, styleProgress } = props;
    let usedValue = props.styleBar;
    if (usedValue > totalValue) { usedValue = totalValue; }

    const usedValueStyle = {
        size: {
            width: (usedValue * 100 / totalValue) + '%'
        }
    };

    return <View style={[styles.container]}>
        <LinearGradient
            colors={['#4b66ff', '#538dff']}
            start={[0.5, 0]}
            style={[
                styles.inner,
                usedValueStyle.size,
                styleProgress
            ]}
        />
    </View>

}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        height: 7,
        borderRadius: 3,
        backgroundColor: '#e8e8e8',
        margin: 20
    },
    inner: {
        position: 'absolute',
        left: 0,
        top: 0,
        height: 10,
        borderRadius: 3
    }
});
