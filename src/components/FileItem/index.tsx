import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Platform } from 'react-native';
import { TouchableWithoutFeedback } from 'react-native-gesture-handler';
import { connect } from 'react-redux';
import IconFolder from '../IconFolder';
import TimeAgo from 'react-native-timeago';
import Icon from '../../../assets/icons/Icon';
import IconFile from '../IconFile';
import { fileActions, layoutActions } from '../../redux/actions';
import RNFetchBlob from 'rn-fetch-blob'
import { deviceStorage, getLyticsData } from '../../helpers';
import FileViewer from 'react-native-file-viewer'
import { colors } from '../../redux/constants';
import { reduce } from 'lodash';
import analytics from '../../helpers/lytics';

interface FileItemProps {
    isFolder: boolean
    item: any
    dispatch?: any
    filesState?: any
    isLoading?: boolean
}

async function handleClick(props: any) {
    const isSelectionMode = props.filesState.selectedItems.length > 0

    if (isSelectionMode) {
        // one tap will select file if there are already selected files
        const isSelected = props.filesState.selectedItems.filter((x: any) => x.id === props.item.id).length > 0
        return handleLongPress(props, isSelected)
    }

    // one tap on a folder will open and load contents
    if (props.isFolder) {
        const userData = await getLyticsData()
        analytics.track('folder-opened', {
            userId: userData.uuid,
            email: userData.email,
            folder_id: props.item.id
        })
        props.dispatch(fileActions.getFolderContent(props.item.id))
    } else {
        // one tap on a file will download and preview the file

        // Dispatch file download start
        props.dispatch(fileActions.downloadSelectedFileStart())

        try {
            const userData = await getLyticsData()
            analytics.track('file-download-start', {
                file_id: props.item.id,
                file_size: props.item.size,
                file_type: props.item.type,
                email: userData.email,
                folder_id: props.item.folder_id,
                platform: 'mobile'
            })
        } catch { }
        const xToken = await deviceStorage.getItem('xToken')
        const xUser = await deviceStorage.getItem('xUser')
        const xUserJson = JSON.parse(xUser || '{}')
        return RNFetchBlob.config({
            appendExt: props.item.type,
            path: RNFetchBlob.fs.dirs.DocumentDir + '/' + props.item.name + '.' + props.item.type,
            fileCache: true
        }).fetch('GET', `${process.env.REACT_NATIVE_API_URL}/api/storage/file/${props.item.fileId}`, {
            'Authorization': `Bearer ${xToken}`,
            'internxt-mnemonic': xUserJson.mnemonic
        }).progress((progress, total) => {
            console.log(progress + ' ' + total)
        }).then(async (res) => {
            if (res.respInfo.status === 200) {
                if (Platform.OS === 'ios') {
                    // RNFetchBlob.ios.previewDocument(res.path())
                } else {
                    // RNFetchBlob.android.actionViewIntent(res.path(), '')
                }
                FileViewer.open(res.path()).catch(err => {
                    Alert.alert('Error opening file', err.message)
                })
            } else {
                Alert.alert('Error downloading file')
            }

            try {
                const userData = await getLyticsData()
                analytics.track('file-download-finished', {
                    file_id: props.item.id,
                    file_size: props.item.size,
                    file_type: props.item.type,
                    email: userData.email,
                    folder_id: props.item.folder_id,
                    platform: 'mobile'
                })
            } catch {
                console.log('Cannot track file-download-finished')
            }

        }).catch(async err => {
            console.log('Error downloading file: ' + err.message)

            try {
                const userData = await getLyticsData()
                analytics.track('file-download-error', {
                    file_id: props.item.id,
                    file_size: props.item.size,
                    file_type: props.item.type,
                    email: userData.email,
                    folder_id: props.item.folder_id,
                    platform: 'mobile',
                    msg: err && err.message
                })
            } catch {
                console.log('Cannot track file-download-error')
            }

        }).finally(() => {
            // Dispatch download file end
            props.dispatch(fileActions.downloadSelectedFileStop())
        })
    }
}

async function handleLongPress(props: any, isSelected: boolean) {
    if (isSelected) {
        props.dispatch(fileActions.deselectFile(props.item))
    } else {
        props.dispatch(fileActions.selectFile(props.item))
    }
}

function FileItem(props: FileItemProps) {
    const isSelectionMode = props.filesState.selectedItems.length > 0
    const isSelected = props.filesState.selectedItems.filter((x: any) => x.id === props.item.id).length > 0

    const [isLoading, setIsLoading] = useState(props.isLoading ? true : false)

    const extendStyles = StyleSheet.create({
        text: { color: '#000000' },
        containerBackground: { backgroundColor: isSelected ? '#f2f5ff' : '#fff' }
    });

    const item = props.item

    return (
        <View style={[styles.container, extendStyles.containerBackground]}>
            <View style={styles.fileDetails}>
                <TouchableWithoutFeedback
                    style={styles.touchableItemArea}
                    onLongPress={() => { handleLongPress(props, isSelected) }}
                    onPress={() => {
                        setIsLoading(true)
                        handleClick(props).finally(() => {
                            setIsLoading(false)
                        })
                    }}>

                    <View style={styles.itemIcon}>
                        {props.isFolder
                            ? <>
                                <IconFolder color={props.item.color} />
                                {props.isFolder && props.item.icon
                                    ? <View style={{
                                        position: 'absolute',
                                        left: 35,
                                        top: 7
                                    }}>
                                        <Icon
                                            name={props.item.icon.name}
                                            color={item.color ? colors[item.color].icon : colors['blue'].icon}
                                            width={24}
                                            height={24}
                                        />
                                    </View>
                                    : <></>}
                            </>
                            : <IconFile label={props.item.type || ''} isLoading={isLoading} />}
                    </View>
                    <View style={styles.nameAndTime}>
                        <Text
                            style={[styles.fileName, extendStyles.text]}
                            numberOfLines={1}
                        >{props.item.name}</Text>
                        {!props.isFolder && <TimeAgo time={props.item.created_at} />}
                    </View>
                </TouchableWithoutFeedback>
            </View>
            <View style={styles.buttonDetails}>
                <TouchableWithoutFeedback
                    style={{ display: isSelectionMode ? 'none' : 'flex' }}
                    onPress={() => {
                        props.dispatch(layoutActions.openItemModal(props.item))
                    }}>
                    <Icon name="details" />
                </TouchableWithoutFeedback>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        height: 80,
        borderBottomWidth: 1,
        borderColor: '#e6e6e6',
        flexDirection: 'row',
        alignItems: 'center'
    },
    fileDetails: {
        flexGrow: 1
    },
    touchableItemArea: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    itemIcon: {
    },
    nameAndTime: {
        flexDirection: 'column',
        width: 230
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
        borderRadius: 30,
        width: 51,
        height: 51,
        alignItems: 'center',
        justifyContent: 'center'
    }
});



const mapStateToProps = (state: any) => {
    return { ...state };
};

export default connect(mapStateToProps)(FileItem);