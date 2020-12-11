import React from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { connect } from 'react-redux';

interface IconFileProps {
    label: string
    isLoading: boolean
}

function IconFile(props: IconFileProps) {
    const { label = '', isLoading = false } = props;

    return <View style={styles.wrapper}>
        {isLoading
            ? <ActivityIndicator style={{ position: 'absolute' }} size='small' color="gray" />
            : <Text numberOfLines={1} style={styles.text}>{label.toUpperCase()}</Text>}

    </View>

}

const mapStateToProps = (state: any) => {
    return { ...state };
};

export default connect(mapStateToProps)(IconFile);

const styles = StyleSheet.create({
    wrapper: {
        position: 'relative',
        width: 44,
        height: 42,
        marginLeft: 25,
        marginRight: 25,
        borderRadius: 3,
        borderColor: '#5291ff',
        borderWidth: 0.6,
        alignItems: 'center',
        justifyContent: 'center'
    },
    text: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 5,
        fontFamily: 'CircularStd-Bold',
        fontSize: 9,
        letterSpacing: -0.2,
        color: '#2e7bff',
        textAlign: 'center',
        paddingHorizontal: 5
    },
    activityIndicator: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
    }
});

