import React from 'react';
import { View, Text, StyleSheet, Alert, Platform } from 'react-native';
import { TouchableHighlight } from 'react-native-gesture-handler';
import { connect } from 'react-redux';
import IconFolder from '../IconFolder';
import TimeAgo from 'react-native-timeago';
import Icon from '../../../assets/icons/Icon';
import IconFile from '../IconFile';
import { fileActions } from '../../redux/actions';
import RNFetchBlob from 'rn-fetch-blob'
import { deviceStorage } from '../../helpers';

interface FileItemProps {
    isFolder: boolean
    item: any
    dispatch?: any
}

async function handleClick(isFolder: boolean, item: any, dispatch: any) {
    if (isFolder) {
        dispatch(fileActions.getFolderContent(item.id))
    } else {
        const xToken = await deviceStorage.getItem('xToken')
        const xUser = await deviceStorage.getItem('xUser')
        const xUserJson = JSON.parse(xUser || '{}')
        console.log(xUserJson.mnemonic)
        RNFetchBlob.config({
            fileCache: true,
            addAndroidDownloads: {
                notification: true,
                title: 'File downloaded',
                description: item.name + '.' + item.type
            },
            IOSBackgroundTask: true,
            indicator: true
        }).fetch('GET', `${process.env.REACT_NATIVE_API_URL}/api/storage/file/${item.id}`, {
            Authorization: `Bearer ${xToken}`
        }).then((res) => {
            if (Platform.OS === 'ios') {
                RNFetchBlob.ios.previewDocument(res.path())
            } else {
                RNFetchBlob.android.actionViewIntent(res.path(), '')
            }
            console.log('File saved to ' + res.path())
        }).catch(err => {
            console.log('Error downloading file: ' + err.message)
        })
    }
}

function FileItem(props: FileItemProps) {
    const isSelected = false
    const extendStyles = StyleSheet.create({
        text: { color: '#000000' },
        containerBackground: { backgroundColor: isSelected ? '#f2f5ff' : '#fff' }
    });

    return <TouchableHighlight
        underlayColor="#fff"
        style={[styles.container, extendStyles.containerBackground]}
        onPress={() => { handleClick(props.isFolder, props.item, props.dispatch) }}>
        <View style={styles.fileDetails}>
            <View
                style={styles.itemIcon}>
                {props.isFolder
                    ? <>
                        <IconFolder
                            color={props.item.color} />
                        {props.item.icon
                            ? <View style={{
                                position: 'absolute',
                                left: 35,
                                top: 7
                            }}>
                                <Icon name={props.item.icon} />
                            </View>
                            : <></>}
                    </>
                    : <IconFile
                        label={props.item.type} />}
            </View>
            <View style={styles.nameAndTime}>
                <Text
                    style={[styles.fileName, extendStyles.text]}
                    numberOfLines={1}
                >{props.item.name}</Text>
                {!props.isFolder && <TimeAgo time={props.item.created_at} />}
            </View>
            <View>
                <TouchableHighlight
                    style={styles.buttonDetails}
                    underlayColor="#f2f5ff"
                >
                    <Text>iii</Text>
                </TouchableHighlight>
            </View>
        </View>
    </TouchableHighlight>
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        height: 80,
        borderBottomWidth: 1,
        borderColor: '#e6e6e6'
    },
    fileDetails: {
        flexDirection: 'row'
    },
    itemIcon: {},
    nameAndTime: {
        justifyContent: 'center',
        flex: 7
    },
    fileName: {
        fontFamily: 'CircularStd-Bold',
        fontSize: 16,
        letterSpacing: -0.1,
        color: '#000000'
    },
    fileUpdated: {
        fontFamily: 'CircularStd-Book',
        fontSize: 13,
        color: '#2a5fc9',
        marginTop: 2
    },
    buttonDetails: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 51,
        height: 51,
        marginRight: 10,
        borderRadius: 25.5,
        flex: 1
    }
});



const mapStateToProps = (state: any) => {
    return { ...state };
};

export default connect(mapStateToProps)(FileItem);