import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import Modal from 'react-native-modalbox';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { connect } from 'react-redux';
import { layoutActions } from '../../redux/actions';
import PlanCard from './PlanCard';

interface OutOfSpaceProps {
    layoutState?: any
    filesState?: any
    authenticationState?: any
    dispatch?: any
}

function OutOfSpaceModal(props: OutOfSpaceProps) {
    const [ isOpen, setIsOpen ] = useState(props.layoutState.showOutOfSpaceModal)

    useEffect(() => {
        props.layoutState.showOutOfSpaceModal ? setIsOpen(true) : null

    }, [props.layoutState.showOutOfSpaceModal])

    return (
        <Modal isOpen={isOpen}
            swipeArea={2}
            onClosed={() => {
                props.dispatch(layoutActions.closeOutOfSpaceModal())
            }} 
            position='center' 
            style={styles.container}
        >
            <View style={styles.title_container}>
                <Text style={styles.title}>
                    Run out of space
                </Text>

                <Text style={styles.subtitle}>
                    You have currently used 1GB of storage. To start uploading more files, please upgrade your storage plan.
                </Text>
            </View>

            <View style={styles.cards_container}>
                <PlanCard size={1} free={true} />
                <PlanCard size={100} price='4.49' />
                <PlanCard size={1000} price='9.95' />
            </View>

            <View style={styles.buttons_container}>
                <TouchableOpacity style={styles.button}
                    onPress={() => {
                        props.dispatch(layoutActions.closeOutOfSpaceModal())
                        setIsOpen(false)
                    }}
                >
                    <Text style={styles.button_text}>Close</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.button, styles.blue]}
                    onPress={() => {

                    }}
                >
                    <Text style={[styles.button_text, styles.white]}>Upgrade</Text>
                </TouchableOpacity>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({

    container: {
        justifyContent: 'space-around'
    },

    title_container: {
        alignSelf: 'flex-start',
        marginHorizontal: wp('6'),
    },

    title: {
        fontFamily: 'CerebriSans-Bold',
        fontSize: 27,
        letterSpacing: -0.5,
        color: '#000000'
    },

    subtitle: {
        fontFamily: 'CerebriSans-Regular',
        fontSize: 17,
        lineHeight: 23,
        letterSpacing: -0.1,

        marginTop: 15
    },

    cards_container: {
        marginLeft: wp('6')
    },

    buttons_container: {
        flexDirection: 'row',
        justifyContent: 'space-evenly'
    },

    button: {
        height: 50, 
        width: wp('42'),
        borderRadius: 4, 
        borderWidth: 2,
        backgroundColor: '#fff',
        borderColor: 'rgba(151, 151, 151, 0.2)',
        justifyContent: 'center',
        alignItems: 'center'
    },

    blue: {
        backgroundColor: '#4585f5',
        borderWidth: 0
    },

    button_text: {
        fontFamily: 'CerebriSans-Bold',
        fontSize: 16,
        letterSpacing: -0.2,
        color: '#5c6066'
    },
    
    white: {
        color: 'white'
    }
})

const mapStateToProps = (state: any) => {
    return { ...state }
};

export default connect(mapStateToProps)(OutOfSpaceModal)