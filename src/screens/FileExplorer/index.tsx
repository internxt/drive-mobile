import React, { useEffect, useState } from 'react'
import { Text, View, StyleSheet, Image, BackHandler, Platform } from 'react-native'
import AppMenu from '../../components/AppMenu'
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { fileActions } from '../../redux/actions';
import { connect } from 'react-redux';
import FileList from '../../components/FileList';
import SettingsModal from '../../modals/SettingsModal';
import { TouchableHighlight } from 'react-native-gesture-handler';
import { getIcon } from '../../helpers/getIcon';
import FileDetailsModal from '../../modals/FileDetailsModal';
import SortModal from '../../modals/SortModal';

function FileExplorer(props: any) {
    const [selectedKeyId, setSelectedKeyId] = useState(0)
    const { filesState } = props;
    //const currentFolderId = props.navigation.state.params.folderId;
    const parentFolderId = (() => {
        if (props.filesState.folderContent) {
            return props.filesState.folderContent.parentId || null
        } else {
            return null
        }
    })()

    useEffect(() => {
        const backAction = () => {
            if (parentFolderId) {
                // Go to parent folder if exists
                props.dispatch(fileActions.getFolderContent(parentFolderId))
            } else {
                // Exit application if root folder
                BackHandler.exitApp()
            }
            return true;
        };

        const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
        return () => backHandler.remove();
    }, []);

    useEffect(() => {
        const keyId = props.filesState.selectedItems.length > 0 && props.filesState.selectedItems[0].id
        setSelectedKeyId(keyId)
    }, [props.filesState])


    if (!props.authenticationState.loggedIn) {
        props.navigation.replace('Login')
    }


    return <View style={styles.container}>
        <FileDetailsModal key={selectedKeyId} />
        <SettingsModal />
        <SortModal />

        <View style={{ height: Platform.OS === 'ios' ? '5%' : '0%' }}></View>

        <AppMenu navigation={props.navigation} />

        <View style={styles.breadcrumbs}>
            <Text style={styles.breadcrumbsTitle}>
                {filesState.folderContent && filesState.folderContent.parentId
                    ? filesState.folderContent.name
                    : 'All Files'}
            </Text>
            <TouchableHighlight
                underlayColor="#FFF"
                onPress={() => {
                    props.dispatch(fileActions.getFolderContent(parentFolderId))
                }}>
                <View style={parentFolderId ? styles.backButtonWrapper : styles.backHidden}>
                    <Image style={styles.backIcon} source={getIcon('back')} />
                    <Text style={styles.backLabel}>Back</Text>
                </View>
            </TouchableHighlight>
        </View>

        <FileList />

    </View>
}

const mapStateToProps = (state: any) => {
    return { ...state };
};

export default connect(mapStateToProps)(FileExplorer)

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-start',
        backgroundColor: '#fff'
    },
    drawerKnob: {
        backgroundColor: '#d8d8d8',
        width: 56,
        height: 7,
        borderRadius: 4,
        alignSelf: 'center',
        marginTop: 10
    },
    breadcrumbs: {
        display: 'flex',
        flexWrap: 'nowrap',
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderBottomColor: '#e6e6e6',
        borderBottomWidth: 1,
        marginTop: 15,
        paddingBottom: 15
    },
    breadcrumbsTitle: {
        fontFamily: 'CircularStd-Bold',
        fontSize: 21,
        letterSpacing: -0.2,
        paddingLeft: 20,
        color: '#000000'
    },
    modalSettings: {
        height: 380
    },
    modalSettingsFile: {
        height: 370
    },
    modalSettingsProgressBar: {
        height: 6.5,
        marginLeft: 24,
        marginRight: 24
    },
    modalMoveFiles: {
        justifyContent: 'flex-start',
        paddingTop: 30
    },
    sortOption: {
        fontFamily: 'CerebriSans-Bold',
        fontSize: 18,
        paddingTop: 13,
        paddingBottom: 13,
        paddingLeft: 28
    },
    sortOptionSelected: {
        fontFamily: 'CerebriSans-Bold',
        fontSize: 18,
        color: '#0054ff',
        paddingTop: 13,
        paddingBottom: 13,
        paddingLeft: 28
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
    modalFileItemContainer: {
        fontFamily: 'CerebriSans-Regular',
        fontSize: 15,
        paddingLeft: 24,
        paddingBottom: 6,
        justifyContent: 'center'
    },
    modalFileItemIcon: {},
    modalFileItemText: {},
    backButtonWrapper: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 20
    },
    backIcon: {
        height: 12,
        width: 8,
        marginRight: 5
    },
    backLabel: {
        fontFamily: 'CircularStd-Medium',
        fontSize: 19,
        letterSpacing: -0.2,
        color: '#000000'
    },
    backHidden: {
        display: 'none'
    }
});
