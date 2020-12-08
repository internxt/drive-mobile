import React from 'react'
import { Text, View, StyleSheet } from 'react-native'
import AppMenu from '../../components/AppMenu'
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { fileActions } from '../../redux/actions';
import { connect } from 'react-redux';
import FileList from '../../components/FileList';
import SettingsModal from '../../modals/SettingsModal';

function FileExplorer(props: any) {
    const { filesState } = props;
    const currentFolderId = props.navigation.state.params.folderId;

    return <View style={styles.container}>
        <View style={{ height: '5%' }}></View>

        <AppMenu />

        <View style={styles.breadcrumbs}>
            <Text style={styles.breadcrumbsTitle}>
                {filesState.folderContent && filesState.folderContent.parentId
                    ? filesState.folderContent.name
                    : 'All Files'}
            </Text>
        </View>

        <SettingsModal isOpen={props.layoutState.showSettingsModal} />

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
    modalFileItemText: {}
});
