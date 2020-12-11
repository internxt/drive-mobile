import prettysize from 'prettysize';
import React, { useState } from 'react'
import { Image, Platform, StyleSheet, Text, View } from 'react-native'
import { TextInput, TouchableHighlight } from 'react-native-gesture-handler';
import Modal from 'react-native-modalbox'
import TimeAgo from 'react-native-timeago';
import { connect } from 'react-redux';
import Icon from '../../../assets/icons/Icon';
import Separator from '../../components/Separator';
import { getIcon } from '../../helpers/getIcon';
import { fileActions, layoutActions } from '../../redux/actions';
import SettingsItem from '../SettingsModal/SettingsItem';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { colors, folderIconsList } from '../../redux/constants'

interface FileDetailsProps {
    dispatch?: any
    filesState?: any
    layoutState?: any
}

function FileDetailsModal(props: FileDetailsProps) {
    const [inputFileName, setInputFileName] = useState('')
    const [selectedColor, setSelectedColor] = useState('')
    const [selectedIcon, setSelectedIcon] = useState(0)

    const selectedItems = props.filesState.selectedItems
    const showModal = props.layoutState.showItemModal && selectedItems.length > 0

    const file = selectedItems.length > 0 && selectedItems[0]
    const isFolder = file && !selectedItems[0].fileId
    const folder = isFolder && file

    return <>
        {isFolder ? <Modal
            position={'bottom'}
            isOpen={showModal}
            style={styles.modalFolder}
            onOpened={() => setInputFileName(file.name)}
            onClosed={() => {
                props.dispatch(fileActions.deselectAll())
                props.dispatch(layoutActions.closeItemModal())
            }}
            backButtonClose={true}
            animationDuration={200}
        >
            <View style={styles.drawerKnob}></View>

            <View style={{ flexDirection: 'row', paddingRight: 22 }}>
                <TextInput
                    style={{
                        fontFamily: 'CerebriSans-Bold',
                        fontSize: 20,
                        marginLeft: 26,
                        flex: 1
                    }}
                    onChangeText={value => setInputFileName(value)}
                    value={inputFileName}
                />
            </View>

            <Separator />

            <Text
                style={{
                    fontFamily: 'CerebriSans-Bold',
                    fontSize: 15,
                    paddingLeft: 24,
                    paddingBottom: 13
                }}>Style Color</Text>

            <View style={styles.colorSelection}>
                {Object.getOwnPropertyNames(colors).map((value, i) => {
                    let localColor = selectedColor ? selectedColor : (folder ? folder.color : null);
                    let isSelected = localColor ? localColor === value : false;
                    return (
                        <TouchableHighlight
                            key={i}
                            underlayColor={colors[value].darker}
                            style={[{ backgroundColor: colors[value].code }, styles.colorButton]}
                            onPress={() => setSelectedColor(value)}
                        >
                            {isSelected ? (
                                <Icon name="checkmark" width={15} height={15} />
                            ) : <></>}
                        </TouchableHighlight>
                    );
                })}
            </View>

            <Separator />

            <Text
                style={{
                    fontFamily: 'CerebriSans-Bold',
                    fontSize: 15, paddingLeft: 24, paddingBottom: 13
                }}>Cover Icon</Text>

            <View style={styles.iconSelection} key={selectedIcon}>
                {folderIconsList.map((value, i) => {
                    let localIcon =
                        typeof selectedIcon === 'number' &&
                            selectedIcon >= 0
                            ? selectedIcon : folder && folder.icon ? folder.icon.id : null;
                    let isSelected = localIcon ? localIcon - 1 === i : false;
                    let iconValue = isSelected ? 0 : i + 1;

                    return (
                        <TouchableHighlight
                            key={i}
                            style={styles.iconButton}
                            underlayColor="#F2F5FF"
                            onPress={() => setSelectedIcon(iconValue)}
                        >
                            <Icon
                                name={value}
                                color={isSelected ? '#4385F4' : 'grey'}
                                width={30}
                                height={30}
                                style={styles.iconImage}
                            />
                        </TouchableHighlight>
                    );
                })}
            </View>
        </Modal> : <Modal
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
                /></Modal>}
    </>;
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
    },
    modalFolder: {
        height: hp('90%') < 550 ? 550 : Math.min(600, hp('90%'))
    },
    colorSelection: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginLeft: 15,
        marginRight: 15
    },
    colorButton: {
        height: 27,
        width: 27,
        borderRadius: 15,
        marginLeft: 9,
        marginRight: 9,
        justifyContent: 'center',
        alignItems: 'center'
    },
    iconSelection: {
        display: 'flex',
        flexWrap: 'wrap',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginLeft: 15,
        marginRight: 15
    },
    iconButton: {
        height: 43,
        width: 43,
        margin: hp('90%') < 600 ? 5 : 8,
        justifyContent: 'center',
        alignItems: 'center'
    },
    iconImage: {
        height: 25,
        width: 25
    },


})