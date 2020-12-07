import React, { Fragment } from 'react'
import { View, StyleSheet, Platform, Text } from 'react-native'
import { connect } from 'react-redux';
import { layoutActions } from '../../redux/actions';
import MenuItem from '../MenuItem';

function handleUpload() {

}

function handleFolderCreate() {

}

function AppMenu(props: any) {

    return <View>
        <Fragment>
            <View style={styles.buttonContainer}>
                <View style={styles.commonButtons}>
                    <MenuItem
                        name="search"
                        onClickHandler={() =>
                            props.dispatch(layoutActions.openSearch())
                        } />

                    <MenuItem
                        name="list"
                        onClickHandler={() => {
                            props.dispatch(layoutActions.openSortModal());
                        }} />

                    <MenuItem name="upload" onClickHandler={handleUpload} />

                    <MenuItem
                        name="create"
                        onClickHandler={() => handleFolderCreate(/* folderContent.id */)} />

                    {props.filesState.selectedItems.length > 0 ? (
                        <MenuItem name="delete" onClickHandler={props.deleteItems} />
                    ) : (<View></View>)}
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
        flexDirection: 'row'
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