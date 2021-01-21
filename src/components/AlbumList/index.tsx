import React, { useEffect, useState } from 'react'
import { ScrollView, Text, RefreshControl, StyleSheet, Pressable, View } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { connect } from 'react-redux';
import { PhotoActions } from '../../redux/actions';
import AlbumCard from '../AlbumCard';
import EmptyAlbum from '../EmptyAlbum';
import PhotoItem from '../PhotoItem';
import { IPhoto } from '../PhotoList';


export interface IAlbum {
    id: number
    albumId: number
    bucket: string
    name: string
    content: any[]
    createdAt: Date
    updatedAt: Date
}

interface AlbumListProps {
    title: string
    photos: IPhoto[]
    photosState?: any
    authenticationState?: any
    dispatch?: any
    navigation: any
}

function AlbumList(props: AlbumListProps) {
    const [refreshing, setRefreshing] = useState(false)

    const { photosState } = props;
    const { folderContent } = photosState;

    let albumList: IPhoto[] = props.photos || [];

    useEffect(() => {
        setRefreshing(false)
    }, [props.photosState.folderContent])

    const searchString = props.photosState.searchString

    if (searchString) {
        albumList = albumList.filter((photo: IPhoto) => photo.name.toLowerCase().includes(searchString.toLowerCase()))
    }

    const sortFunction = props.photosState.sortFunction

    if (sortFunction) {
        albumList.sort(sortFunction);
    }

    /*useEffect(() => {
        if (!props.photosState.folderContent) {
            const rootFolderId = props.authenticationState.user.root_folder_id

            props.dispatch(PhotoActions.getFolderContent(rootFolderId))
        }
    }, [])*/

    const isUploading = props.photosState.isUploadingPhotoName
    const isEmptyAlbum = albumList.length === 0 && !isUploading

    useEffect(() => {
        //console.log('--- UPLOADING PROGRESS ON AlbumList ---', photosState.progress)

    }, [photosState.progress])


    const keyExtractor = (item: any, index: any) => index.toString();

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

    console.log("PHOTO LIST   ", props.photos)


    return (
        <View>
            {
                isEmptyAlbum ?
                    <EmptyAlbum />
                    :
                    <Text style={styles.dNone}></Text>
            }


            <View style={styles.photoScroll}>
                <FlatList
                    keyExtractor={keyExtractor}
                    renderItem={renderAlbumItem}
                    data={props.photosState.photos}
                    horizontal={true}
                    showsHorizontalScrollIndicator={false}
                ></FlatList>
            </View>

        </View>
    )
}

const styles = StyleSheet.create({
    AlbumListContentsScrollView: {
        flexGrow: 1,
        justifyContent: 'center'
    },
    dNone: {
        display: 'none'
    },
    photoScroll: {
        display: "flex",
        flexDirection: "row",
        flexWrap: "nowrap",
        marginTop: 0,
    },
})

const mapStateToProps = (state: any) => {
    return { ...state };
};

export default connect(mapStateToProps)(AlbumList)