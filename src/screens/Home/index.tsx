import React, { useEffect, useState } from 'react'
import { Text, View, StyleSheet, Image, BackHandler, Platform, FlatList, Pressable } from 'react-native'
import AppMenu from '../../components/AppMenu'
import { layoutActions, fileActions } from '../../redux/actions';
import { connect } from 'react-redux';
import FileList, { IFolder, IFile } from '../../components/FileList';
import SettingsModal from '../../modals/SettingsModal';
import { TouchableHighlight } from 'react-native-gesture-handler';
import { getIcon } from '../../helpers/getIcon';
//import FileDetailsModal from '../../modals/PhotoDetailsModal';
import SortModal from '../../modals/SortModal';
import DeleteItemModal from '../../modals/DeleteItemModal';
import MoveFilesModal from '../../modals/MoveFilesModal';
import ShareFilesModal from '../../modals/ShareFilesModal';
import { Reducers } from '../../redux/reducers/reducers';
import FileDetailsModal from '../../modals/FileDetailsModal';
import PhotoItem from '../../components/PhotoItem';
import AlbumCard from '../../components/AlbumCard';

interface HomeProps extends Reducers {
    navigation?: any
    dispatch?: any
}

import SourceList from '../../helpers/getAssets';

function Home(props: HomeProps): JSX.Element {
    const [selectedKeyId, setSelectedKeyId] = useState(0)

    const img = require('../../../assets/images/img.jpg')



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
                // eslint-disable-next-line no-console
                console.log('back') // do not delete
                // Go to parent folder if exists
                props.dispatch(fileActions.getFolderContent(parentFolderId))
            } else {
                // Exit application if root folder
                BackHandler.exitApp()
            }
            return true;
        };

        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

        return () => backHandler.remove();
    }, []);

    useEffect(() => {
        parentFolderId === null ? props.dispatch(fileActions.setRootFolderContent(props.filesState.folderContent)) : null

    }, [props.filesState.folderContent])

    useEffect(() => {
        const keyId = props.filesState.selectedItems.length > 0 && props.filesState.selectedItems[0].id

        setSelectedKeyId(keyId)
    }, [props.filesState])

    if (!props.authenticationState.loggedIn) {
        props.navigation.replace('Login')
    }

    const keyExtractor = (item: any, index: any) => index.toString();
    const renderAllPhotoItem = ({ item }: { item: IFile }) => (
        <Pressable
            onPress={() => { props.navigation.navigate('AlbumView', { title: 'All Photos' }) }}
            onLongPress={() => {
                //props.dispatch(fileActions.selectPhoto(item))
            }}
            style={{
                display: "flex",
                flex: 1,
                backgroundColor: '#fff'
            }}
        >
            <PhotoItem source={item} isLoading={props.filesState.loading} />
        </Pressable>
    );

    const renderDeletedPhotoItem = ({ item }: { item: IFile }) => (
        /*<TouchableHighlight
          underlayColor="#fff"
          onPress={() => { this.props.navigation.navigate('AlbumView', { title: 'Deleted Photos' }) }}
          onLongPress={() => { this.selectPhoto(item) }}
          style={{
            display: "flex",
            flex: 1,
            backgroundColor: '#fff',
          }}
        >*/
        <PhotoItem source={item} isLoading={props.filesState.loading} />
        //</TouchableHighlight>
    );

    // TODO: Recover all previews from device, 
    // when the server request finish
    const renderAlbumItem = ({ item }) => (
        <Pressable
            onPress={() => {
                props.navigation.navigate('AlbumView', { title: item.name })
            }}
            onLongPress={() => { }}
        >
            <AlbumCard withTitle={true} navigation={props.navigation} />
        </Pressable>

    );

    return <View style={styles.container}>
        <FileDetailsModal key={selectedKeyId} />
        <SettingsModal navigation={props.navigation} />
        <SortModal />

        <MoveFilesModal />


        <View style={styles.platformSpecificHeight}></View>

        <AppMenu navigation={props.navigation} />


        <View style={styles.albumsContainer}>
            <View style={styles.albumsHeader}>
                <Text style={styles.albumsTitle}>
                    Albums
                  </Text>
                <TouchableHighlight
                    onPress={() => { props.dispatch(layoutActions.openSortModal()) }}
                >
                    <Text style={styles.albumsSort}>
                        Name
              </Text>
                </TouchableHighlight>

            </View>

            <View style={styles.photoScroll}>
            <FlatList
              keyExtractor={keyExtractor}
              renderItem={renderAlbumItem}
              data={SourceList}
              horizontal={true}
              showsHorizontalScrollIndicator={false}
            ></FlatList>
            </View>
        </View>


        <View style={styles.albumsContainer}>
            <View style={styles.albumHeader}>
                <Text style={styles.albumsTitle}>
                    All Photos
            </Text>
            </View>

            <TouchableHighlight
                style={styles.photoScroll}
                underlayColor="#FFF"
                onPress={() => { props.navigation.navigate('AlbumView', { title: 'All Photos' }) }}
            >
                <View>
                    <FlatList
                        keyExtractor={keyExtractor}
                        renderItem={renderAllPhotoItem}
                        data={SourceList}
                        horizontal={true}
                        showsHorizontalScrollIndicator={false}
                    ></FlatList>
                </View>
            </TouchableHighlight>
        </View>

        <View style={styles.albumsContainer}>
            <TouchableHighlight
                underlayColor="#FFF"
            >
                <View

                >
                    <View style={styles.albumHeader}>
                        <Text style={styles.albumsTitle}>
                            Deleted
                </Text>
                    </View >

                    <TouchableHighlight
                        style={styles.photoScroll}
                        underlayColor="#fff"
                        onPress={() => { props.navigation.navigate('AlbumView', { title: 'Deleted Photos' }) }}
                    >
                        <View>
                            <FlatList
                                keyExtractor={keyExtractor}
                                renderItem={renderDeletedPhotoItem}
                                data={SourceList}
                                horizontal={true}
                                showsHorizontalScrollIndicator={false}
                            ></FlatList>
                        </View>
                    </TouchableHighlight>
                </View>
            </TouchableHighlight>
        </View>
    </View>
}

const mapStateToProps = (state: any) => {
    return { ...state };
};

export default connect(mapStateToProps)(Home)

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-start',
        backgroundColor: '#fff'
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
        fontFamily: 'Averta-Bold',
        fontSize: 21,
        letterSpacing: -0.2,
        paddingLeft: 20,
        color: '#000000'
    },
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
        fontFamily: 'Averta-Medium',
        fontSize: 19,
        letterSpacing: -0.2,
        color: '#000000'
    },
    backHidden: {
        display: 'none'
    },
    platformSpecificHeight: {
        height: Platform.OS === 'ios' ? '5%' : '0%'
    },
    container2: {
        display: "flex",
        flex: 1,
        backgroundColor: '#fff',

    },
    photoScroll: {
        display: "flex",
        flexDirection: "row",
        flexWrap: "nowrap",
        marginTop: 25,
    },
    drawerKnob: {
        backgroundColor: '#d8d8d8',
        width: 56,
        height: 7,
        borderRadius: 4,
        alignSelf: 'center',
        marginTop: 10
    },
    albumsContainer: {
        display: "flex",
        paddingHorizontal: 0,
        paddingVertical: 10,

    },
    albumsHeader: {
        flex: 1,
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 5,
        paddingHorizontal: 10,

    },
    albumHeader: {
        flex: 1,
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 15,
        paddingHorizontal: 10,
    },
    albumsTitle: {
        fontFamily: 'Averta-Bold',
        fontSize: 18,
        letterSpacing: -0.13,
        paddingTop: 10,
        color: 'black',
        alignSelf: 'flex-start',
        height: 30,
    },
    albumsSort: {
        fontFamily: 'Averta-Semibold',
        fontSize: 14,
        letterSpacing: -0.13,
        paddingTop: 10,
        color: '#bfbfbf',
        alignSelf: 'flex-start',
        height: 30,
        width: 50,

        borderColor: 'red',
        borderWidth: 3
    },


    modalSettings: {
        height: 350
    },
    modalSettingsFile: {
        height: 420
    },
    modalSettingsProgressBar: {
        height: 6.5,
        marginLeft: 24,
        marginRight: 24
    },
    modalMovePics: {
        //height: hp('90%'),
        //width: wp('90%'),
        justifyContent: 'flex-start',
        paddingTop: 30
    },
    sortOption: {
        fontFamily: 'Averta-Regular',
        fontSize: 18,
        paddingTop: 13,
        paddingBottom: 13,
        paddingLeft: 28
    },
    sortMenu: {
        borderWidth: 3,
        borderColor: 'red',
        height: 50,
        width: 50
    },
    sortOptionSelected: {
        fontFamily: 'Averta-Regular',
        fontSize: 18,
        color: '#0054ff',
        paddingTop: 13,
        paddingBottom: 13,
        paddingLeft: 28
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
        justifyContent: 'center',
        alignItems: 'center'
    },
    iconImage: {
        height: 25,
        width: 25
    },
    itemList: {
        marginLeft: 5,
        marginRight: 5,
        marginTop: 5,
        flex: 1,
        height: 25,
        width: 25
    },
});