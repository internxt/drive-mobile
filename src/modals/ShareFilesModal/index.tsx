import { addListener } from 'process';
import React, { useEffect, useState } from 'react';
import { Image, View, Text, StyleSheet } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import Modal from 'react-native-modalbox';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { connect } from 'react-redux';
import Separator from '../../components/Separator';
import { fileActions, layoutActions } from '../../redux/actions';
import { Picker } from '@react-native-picker/picker';

export interface ShareFilesModalProps {
    dispatch?: any,
    filesState?: any,
    fileActions?: any,
    layoutState?: any,
}

function ShareFilesModal(props: ShareFilesModalProps) {
    const [ isOpen, setIsOpen ] = useState(props.layoutState.showShareModal)

    useEffect(() => {
        props.layoutState.showShareModal ? setIsOpen(true) : null
    }, [props.layoutState])
 
    return (
        <Modal 
            isOpen={isOpen}
            swipeArea={2}
            onClosed={() => {
                props.dispatch(layoutActions.closeShareModal())
                setIsOpen(false)
                console.log('--- PROPS ON CLOSE ---', props.layoutState)
            }} 
            position='center' 
            style={styles.modal_container}
        >
            <Text style={styles.title}>File name.jpg</Text>

            <Separator />

            <View>
                <Text style={styles.subtitle}>Share your Drive file with this private link, or enter the number of times you'd like the link to be valid: </Text>
                <Picker
                    selectedValue={1}
                    style={{height: 50, width: 100}}
                >
                    <Picker.Item label="1" value="1" />
                    <Picker.Item label="2" value="2" />
                </Picker>
            </View>

            <View style={styles.share_container}>
                <Text style={styles.link}>This is the link</Text>

                <View style={styles.button_container}>
                    <TouchableOpacity style={styles.button}>
                        <Text style={styles.button_text}>Share</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modal_container: {
        borderRadius: 10,
        height: 'auto',
        width: '93%',
        paddingTop: 20
    },

    title: {
        fontSize: 18, 
        color: 'black',
        fontFamily: 'CircularStd-Bold',
        marginHorizontal: wp('6')
    },

    subtitle: {
        fontSize: 16, 
        letterSpacing: 0.5,
        color: '#737880', 
        marginHorizontal: wp('6'),
        marginVertical: 10
    },
    
    share_container: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderColor: 'rgba(151, 151, 151, 0.2)',
        alignItems: 'center'
    },

    link: {
        flex: 0.8,
        fontSize: 16,
        color: '#737880',
        marginLeft: wp('6')
    },

    button_container: {
        flex: 0.2,
        borderLeftWidth: 1,
        borderColor: 'rgba(151, 151, 151, 0.2)',
        padding: 20,
    },
    
    button: {
        justifyContent: 'center',
        alignItems: 'center'
    },

    button_text: {
        fontSize: 18, 
        color: '#4585f5',     
        fontFamily: 'CircularStd-Bold'
    },
})

const mapStateToProps = (state: any) => {
    return { ...state }
};

export default connect(mapStateToProps)(ShareFilesModal)