import React, { Fragment, useState, useRef } from 'react'
import { View, StyleSheet, Platform, TextInput, Image} from 'react-native'
import { TouchableWithoutFeedback } from 'react-native-gesture-handler';
import { connect } from 'react-redux';
import { getIcon } from '../../helpers/getIcon';
import { fileActions, layoutActions } from '../../redux/actions';
import MenuItem from '../MenuItem';

interface AppMenuProps {
    navigation?: any
    filesState?: any
    dispatch?: any
}

function AppMenu(props: AppMenuProps) {
    const [activeSearchBox, setActiveSearchBox] = useState(false)

    const selectedItems = props.filesState.selectedItems;

    const textInput = useRef(null)

    const handleClickSearch = () => {
        textInput.current.focus();
    }
    
    const closeSearch = () => {
        textInput.current.blur();
    }

    return <View
        style={styles.container}>

        <View style={[styles.searchContainer, { display: activeSearchBox ? 'flex' : 'none' }]}>
            <Image
                style={{ marginLeft: 20, marginRight: 10 }}
                source={getIcon('search')}
            />

            <TextInput
                ref={textInput}
                style={styles.searchInput}
                placeholder="Search"
                value={props.filesState.searchString}
                onChange={e => {
                    props.dispatch(fileActions.setSearchString(e.nativeEvent.text))
                }}
            />

            <TouchableWithoutFeedback
                onPress={() => {
                    props.dispatch(fileActions.setSearchString(''));
                    props.dispatch(layoutActions.closeSearch());
                    setActiveSearchBox(false)
                    closeSearch()
                }}
            >
                <Image
                    style={{ marginLeft: 10, marginRight: 20, height: 16, width: 16 }}
                    source={getIcon('close')}
                />
            </TouchableWithoutFeedback>
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
                            handleClickSearch();

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
                        name="upload" 
                        onClickHandler={() => {
                            props.dispatch(layoutActions.openUploadFileModal())
                        }} />

                    <MenuItem
                        name="create"
                        style={{ marginRight: 10 }}
                        onClickHandler={() => {
                            props.navigation.replace('CreateFolder')
                        }} />

                    {
                        selectedItems.length > 0 ? 
                            <MenuItem name="delete" onClickHandler={() => {
                                props.dispatch(layoutActions.openDeleteModal())
                            }} />
                        : 
                            null
                    }
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