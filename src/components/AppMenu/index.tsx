import React, { Fragment, useEffect, useState } from 'react'
import { View, StyleSheet, Platform, Text, Alert, TextInput, Animated, Image, NativeModules } from 'react-native'
import { TouchableHighlight } from 'react-native-gesture-handler';
import { connect } from 'react-redux';
import { getIcon } from '../../helpers/getIcon';
import { fileActions, layoutActions, userActions } from '../../redux/actions';
import MenuItem from '../MenuItem';
import { getDocumentAsync } from 'expo-document-picker'
import { launchCameraAsync, launchImageLibraryAsync, MediaTypeOptions, requestCameraPermissionsAsync } from 'expo-image-picker'
import Dialog from 'react-native-dialog'
import { getHeaders } from '../../helpers/headers';
import analytics, { getLyticsData } from '../../helpers/lytics';

async function uploadFile(result: any, props: any) {
    const userData = await getLyticsData()

    analytics.track('file-upload-start', { userId: userData.uuid, email: userData.email, device: 'mobile' }).catch(() => { })

    try {
        // Set name for pics/photos
        if (!result.name) result.name = result.uri.split('/').pop();
        result.type = 'application/octet-stream';
        props.dispatch(fileActions.uploadFileStart(result.name));
        const body = new FormData();
        body.append('xfile', result, result.name);

        const token = props.authenticationState.token;
        const mnemonic = props.authenticationState.user.mnemonic;

        const headers = {
            Authorization: `Bearer ${token}`,
            'internxt-mnemonic': mnemonic,
            'Content-type': 'multipart/form-data'
        };
        fetch(`${process.env.REACT_NATIVE_API_URL}/api/storage/folder/${props.filesState.folderContent.currentFolder}/upload`, {
            method: 'POST',
            headers,
            body
        }).then(async resultFetch => {
            if (resultFetch.status === 401) {
                throw resultFetch;
            }
            var data = await resultFetch.text();
            return { res: resultFetch, data };
        }).then(resultFetch => {
            if (resultFetch.res.status === 402) {
                props.dispatch(layoutActions.openRunOutStorageModal());
            } else if (resultFetch.res.status === 201) {
                analytics.track('file-upload-finished', { userId: userData.uuid, email: userData.email, device: 'mobile' }).catch(() => { })
                props.dispatch(fileActions.getFolderContent(props.filesState.folderContent.currentFolder));
            } else {
                Alert.alert('Error', resultFetch.res.error ? resultFetch.data.error : 'Cannot upload file');
            }
        }).catch(errFetch => {
            console.log(errFetch)
            if (errFetch.status === 401) {
                props.dispatch(userActions.signout());
            } else {
                Alert.alert('Error', 'Cannot upload file\n' + errFetch);
            }
        }).finally(() => {
            props.dispatch(fileActions.uploadFileFinished());
        });
    } catch (error) {
        analytics.track('file-upload-error', { userId: userData.uuid, email: userData.email, device: 'mobile' }).catch(() => { })
        console.log('Error:', error);
        props.dispatch(fileActions.uploadFileFinished());
    }
}

function AppMenu(props: any) {
    const [activeSearchBox, setActiveSearchBox] = useState(false)
    const [createFolderVisible, setCreateFolderVisible] = useState(false);
    const [createFolderName, setCreateFolderName] = useState('')

    const currentFolderId = props.filesState.folderContent && props.filesState.folderContent.currentFolder
    const parentFolder = props.filesState.folderContent && props.filesState.folderContent.parentId

    const selectedItems = props.filesState.selectedItems;

    return <View
        style={styles.container}>

        <View style={[
            styles.searchContainer,
            { display: activeSearchBox ? 'flex' : 'none' }]}>
            <Image
                style={{ marginLeft: 20, marginRight: 10 }}
                source={getIcon('search')}
            />
            <TextInput
                style={styles.searchInput}
                placeholder="Search"
                value={props.filesState.searchString}
                onChange={e => {
                    props.dispatch(fileActions.setSearchString(e.nativeEvent.text))
                }}
            />
            <TouchableHighlight
                underlayColor="#fff"
                onPress={() => {
                    props.dispatch(fileActions.setSearchString(''));
                    props.dispatch(layoutActions.closeSearch());
                    setActiveSearchBox(false)
                }}>
                <Image
                    style={{ marginLeft: 10, marginRight: 20, height: 16, width: 16 }}
                    source={getIcon('close')}
                />
            </TouchableHighlight>
        </View>

        <Fragment>
            <View style={[styles.buttonContainer, { display: activeSearchBox ? 'none' : 'flex' }]}>
                <View style={styles.commonButtons}>
                    <MenuItem
                        style={{ marginRight: 10 }}
                        name="search"
                        onClickHandler={() => {
                            setActiveSearchBox(true)
                            props.dispatch(layoutActions.openSearch())
                        }} />

                    <MenuItem
                        style={{ marginRight: 10 }}
                        name="list"
                        onClickHandler={() => {
                            props.dispatch(layoutActions.closeSearch())
                            props.dispatch(layoutActions.openSortModal());
                        }} />

                    <MenuItem
                        style={{ marginRight: 10 }}
                        name="upload" onClickHandler={() => {
                            Alert.alert('Select type of file', '', [
                                {
                                    text: 'Upload a document',
                                    onPress: async () => {
                                        const result = await getDocumentAsync({ type: '*/*', copyToCacheDirectory: false });
                                        if (result.type !== 'cancel') {
                                            uploadFile(result, props);
                                        }
                                    }
                                },
                                {
                                    text: 'Upload media',
                                    onPress: async () => {
                                        const { status } = await requestCameraPermissionsAsync();
                                        if (status === 'granted') {
                                            const result = await launchImageLibraryAsync({ mediaTypes: MediaTypeOptions.All });
                                            if (!result.cancelled) {
                                                uploadFile(result, props);
                                            }
                                        } else {
                                            Alert.alert('Camera permission needed to perform this action')
                                        }
                                    }
                                },
                                {
                                    text: 'Take a photo',
                                    onPress: async () => {
                                        const { status } = await requestCameraPermissionsAsync();
                                        if (status === 'granted') {
                                            const result = await launchCameraAsync();
                                            if (!result.cancelled) {
                                                uploadFile(result, props);
                                            }
                                        }
                                    }
                                },
                                {
                                    text: 'Cancel',
                                    style: 'destructive'
                                }
                            ])
                        }} />

                    <>
                        <Dialog.Container visible={createFolderVisible}>
                            <Dialog.Title>Create new folder</Dialog.Title>
                            <Dialog.Input
                                style={{ borderBottomWidth: Platform.OS == 'ios' ? 0 : 1 }}
                                onChangeText={(value) => setCreateFolderName(value)}
                            ></Dialog.Input>
                            <Dialog.Button label="Cancel" color="red" onPress={() => setCreateFolderVisible(false)}></Dialog.Button>
                            <Dialog.Button label="Create" onPress={() => {
                                if (createFolderName) {
                                    const rootFolder = props.authenticationState.user.root_folder_id
                                    props.dispatch(fileActions.createFolder(currentFolderId || rootFolder, createFolderName))
                                }
                                setCreateFolderVisible(false)
                            }}></Dialog.Button>

                        </Dialog.Container>
                    </>

                    <MenuItem
                        name="create"
                        style={{ marginRight: 10 }}
                        onClickHandler={() => {
                            setCreateFolderVisible(true)
                        }} />

                    {selectedItems.length > 0 ? (
                        <MenuItem name="delete" onClickHandler={() => {
                            if (selectedItems.length > 0) {
                                props.dispatch(fileActions.downloadSelectedFileStart())
                                props.dispatch(fileActions.deleteItems(selectedItems, currentFolderId))
                            }
                        }} />
                    ) : <></>}
                </View>
                <MenuItem
                    name="settings"
                    onClickHandler={() => {
                        props.dispatch(layoutActions.openSettings());
                    }} />
            </View>
        </Fragment>
    </View>
}

const styles = StyleSheet.create({
    buttonContainer: {
        flexDirection: 'row',
        flex: 1,
        justifyContent: 'space-between',
        marginLeft: 17,
        marginRight: 10
    },
    commonButtons: {
        flexDirection: 'row',
        flexGrow: 1
    },
    container: {
        height: 54,
        flexDirection: 'row',
        justifyContent: 'flex-start',
        backgroundColor: '#fff',
        paddingTop: 3,
        marginTop: Platform.OS === 'ios' ? 30 : 0
    },
    button: {
        flex: 1
    },
    breadcrumbs: {
        position: 'relative',
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center'
    },
    breadcrumbsLabel: {
        fontFamily: 'CircularStd-Bold',
        fontSize: 21,
        letterSpacing: -0.2,
        color: '#000000'
    },
    icon: {
        position: 'absolute',
        left: 0,
        top: 17,
        width: 10,
        height: 17,
        resizeMode: 'contain'
    },
    searchContainer: {
        position: 'relative',
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f7f7f7',
        marginLeft: 20,
        marginRight: 20,
        borderRadius: 30
    },
    searchInput: {
        marginLeft: 15,
        marginRight: 15,
        fontFamily: 'CerebriSans-Medium',
        fontSize: 17,
        flex: 1
    }
});

const mapStateToProps = (state: any) => {
    return { ...state };
};

export default connect(mapStateToProps)(AppMenu)