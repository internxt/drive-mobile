import prettysize from 'prettysize';
import React, { useState } from 'react'
import { Image, Platform, StyleSheet, Text, View } from 'react-native'
import { TextInput } from 'react-native-gesture-handler';
import Modal from 'react-native-modalbox'
import { useSafeArea } from 'react-native-safe-area-context';
import TimeAgo from 'react-native-timeago';
import { connect } from 'react-redux';
import Separator from '../../components/Separator';
import { getIcon } from '../../helpers/getIcon';
import { fileActions, layoutActions } from '../../redux/actions';
import SettingsItem from '../SettingsModal/SettingsItem';

interface FileDetailsProps {
    dispatch?: any
}

function FileDetailsModal(props: FileDetailsProps) {
    const [inputFileName, setInputFileName] = useState('')
    const [isOpen, setIsOpen] = useState(false)

    const selectedItems = props.filesState.selectedItems
    const showModal = props.layoutState.showItemModal && selectedItems.length > 0

    const file = selectedItems.length > 0 && selectedItems[0]

    return <Modal
        position={'bottom'}
        style={styles.modalSettingsFile}
        isOpen={showModal}
        onOpened={() => setInputFileName(file.name)}
        onClosed={() => {
            props.dispatch(fileActions.deselectAll())
            props.dispatch(layoutActions.closeItemModal())
        }}
        backButtonClose={true}
        backdropPressToClose={true}
        animationDuration={200}
    >
        <View style={styles.drawerKnob}></View>

        <TextInput
            style={{
                fontFamily: 'CerebriSans-Bold',
                fontSize: 20,
                marginLeft: 26,
                marginTop: 20
            }}
            onChangeText={value => setInputFileName(value)}
            value={inputFileName}
        />

        <Separator />

        <Text
            style={{
                fontFamily: 'CerebriSans-Regular',
                fontSize: 15,
                paddingLeft: 24,
                paddingBottom: 6
            }}
        >
            <Text>Type: </Text>
            <Text style={{ fontFamily: 'CerebriSans-Bold' }}>
                {file && file.type ? file.type.toUpperCase() : ''}
            </Text>
        </Text>

        <Text
            style={{
                fontFamily: 'CerebriSans-Regular',
                fontSize: 15,
                paddingLeft: 24,
                paddingBottom: 6
            }}
        >
            <Text>Added: </Text>
            <Text style={{ fontFamily: 'CerebriSans-Bold' }}>
                {file ? <TimeAgo time={file.created_at} /> : ''}
            </Text>
        </Text>

        <Text
            style={{
                fontFamily: 'CerebriSans-Regular',
                fontSize: 15,
                paddingLeft: 24,
                paddingBottom: 6
            }}
        >
            <Text>Size: </Text>
            <Text style={{ fontFamily: 'CerebriSans-Bold' }}>
                {file ? prettysize(file.size) : ''}
            </Text>
        </Text>

        <Separator />

        <SettingsItem
            text={
                <Text style={styles.modalFileItemContainer}>
                    <Image source={getIcon('move')} style={{ width: 20, height: 20 }} />
                    <Text style={{ width: 20 }}> </Text>
                    <Text style={{ fontFamily: 'CerebriSans-Bold' }}> Move</Text>
                </Text>
            }
            onClick={() => {
                props.dispatch(layoutActions.openMoveFilesModal());
            }}
        />

        <SettingsItem
            text={
                <Text style={styles.modalFileItemContainer}>
                    <Image source={getIcon('share')} style={{ width: 20, height: 14 }} />
                    <Text style={{ width: 20 }}> </Text>
                    <Text style={{ fontFamily: 'CerebriSans-Bold' }}> Share</Text>
                </Text>
            }
            onClick={() => {
                /* shareFile(props.filesState.selectedFile); */
            }}
        />

        <SettingsItem text={
            <Text style={styles.modalFileItemContainer}>
                <Image source={getIcon('delete')} style={{ width: 16, height: 21 }} />
                <Text style={{ width: 20 }}> </Text>
                <Text style={{ fontFamily: 'CerebriSans-Bold' }}> Delete</Text>
            </Text>
        }
            onClick={() => {
                /*
                modalDeleteFiles.current.open();
                modalItem.current.close();
                */
            }}
        /></Modal>;
}

const mapStateToProps = (state: any) => {
    return { ...state };
};

export default connect(mapStateToProps)(FileDetailsModal)

const styles = StyleSheet.create({
    modalSettingsFile: {
        top: '40%'
    },
    modalFileItemContainer: {
    },
    drawerKnob: {
        backgroundColor: '#d8d8d8',
        width: 56,
        height: 7,
        borderRadius: 4,
        alignSelf: 'center',
        marginTop: 10
    }
})