import { getDocumentAsync } from 'expo-document-picker';
import { launchCameraAsync, requestCameraPermissionsAsync } from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { Image, View, Text, StyleSheet, Alert } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import Modal from 'react-native-modalbox';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { connect } from 'react-redux';
import analytics, { getLyticsData } from '../../helpers/lytics';
import { fileActions, layoutActions, userActions } from '../../redux/actions';

export interface UploadFileProps {
    dispatch?: any,
    filesState?: any,
    fileActions?: any,
    layoutState?: any,
}

function UploadFile(props: UploadFileProps) {
    const [isOpen, setIsOpen] = useState(props.layoutState.showUploadModal)

    useEffect(() => {
        props.layoutState.showUploadModal ? setIsOpen(true) : null

    }, [props.layoutState.showUploadModal])

    const uploadFile = async (result: any, props: any) => {
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
                const data = await resultFetch.text();
                return { res: resultFetch, data };
            }).then(resultFetch => {
                if (resultFetch.res.status === 402) {
                    props.dispatch(layoutActions.openRunOutStorageModal());
                } else if (resultFetch.res.status === 201) {
                    analytics.track('file-upload-finished', { userId: userData.uuid, email: userData.email, device: 'mobile' }).catch(() => { })
                    props.dispatch(fileActions.getFolderContent(props.filesState.folderContent.currentFolder));
                } else {
                    Alert.alert('Error', 'Cannot upload file');
                }
            }).catch(errFetch => {
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
            props.dispatch(fileActions.uploadFileFinished());
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            swipeArea={2}
            onClosed={() => {
                props.dispatch(layoutActions.closeUploadFileModal())
                setIsOpen(false)
            }}
            position='center'
            style={styles.modal_container}
        >
            <View style={styles.text_container}>
                <View style={styles.title_container}>
                    <Image source={require('../../../assets/images/logo.png')} style={styles.image} />
                    <Text style={styles.title}>Upload file</Text>
                </View>

                <Text style={styles.subtitle}>Take a photo or upload an existing file to our private cloud.</Text>
            </View>

            <View style={styles.button_container}>
                <TouchableOpacity style={styles.button}
                    onPress={async () => {
                        const { status } = await requestCameraPermissionsAsync()
                        if (status === 'granted') {
                            const result = await launchCameraAsync()
                            if (!result.cancelled) {
                                uploadFile(result, props)
                                props.dispatch(layoutActions.closeUploadFileModal())
                                setIsOpen(false)
                            }
                        }
                    }}
                >
                    <Text style={styles.button_text}>Take a photo</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.button}
                    onPress={async () => {
                        const result = await getDocumentAsync({ type: "*/*", copyToCacheDirectory: false })
                        if (result.type !== 'cancel') {
                            uploadFile(result, props)
                            props.dispatch(layoutActions.closeUploadFileModal())
                            setIsOpen(false)
                        }
                    }}
                >
                    <Text style={styles.button_text}>Select a file</Text>
                </TouchableOpacity>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modal_container: {
        borderRadius: 10,
        height: 'auto',
        width: '93%'
    },

    text_container: {
        paddingTop: 20,
        paddingHorizontal: wp('6')
    },

    title_container: {
        flexDirection: 'row',
        alignItems: 'flex-end'

    },

    image: {
        height: 30,
        width: 26,
        marginRight: 10,
        marginBottom: 4
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
        color: '#5c6066',
        marginTop: 15
    },
    button_container: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 30,
        borderTopWidth: 1,
        borderColor: 'rgba(151, 151, 151, 0.2)'
    },
    button: {
        height: 65,
        width: wp('46.5'),
        backgroundColor: '#fff',
        borderRightWidth: 1,
        borderBottomRightRadius: 10,
        borderBottomLeftRadius: 10,
        borderColor: 'rgba(151, 151, 151, 0.2)',
        justifyContent: 'center',
        alignItems: 'center'
    },

    button_text: {
        fontSize: 18,
        color: '#4585f5',
        fontFamily: 'CerebriSans-Bold'
    }
})

const mapStateToProps = (state: any) => {
    return { ...state }
};

export default connect(mapStateToProps)(UploadFile)