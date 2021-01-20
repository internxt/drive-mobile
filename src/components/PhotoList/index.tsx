import React, { useEffect, useState } from 'react'
import { ScrollView, Text, RefreshControl, StyleSheet, Pressable, View } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { connect } from 'react-redux';
import { PhotoActions } from '../../redux/actions';
import EmptyFolder from '../EmptyFolder';
import PhotoItem from '../PhotoItem';


export interface IPhoto {
    id: number
    photoId: number
    albumId: number
    bucket: string
    uri: string
    name: string
    type: string
    size: number
    createdAt: Date
    updatedAt: Date
}

interface PhotoListProps {
    title: string
    photos: IPhoto[]
    photosState?: any
    authenticationState?: any
    dispatch?: any
    navigation: any
}

function PhotoList(props: PhotoListProps) {
    const [refreshing, setRefreshing] = useState(false)

    const { photosState } = props;
    const { folderContent } = photosState;

    let photoList: IPhoto[] = props.photos || [];

    console.log("PHOTO LIST   ", props.photos)

    useEffect(() => {
        setRefreshing(false)
    }, [props.photosState.folderContent])

    const searchString = props.photosState.searchString

    if (searchString) {
        photoList = photoList.filter((photo: IPhoto) => photo.name.toLowerCase().includes(searchString.toLowerCase()))
    }

    const sortFunction = props.photosState.sortFunction

    if (sortFunction) {
        photoList.sort(sortFunction);
    }

    /*useEffect(() => {
        if (!props.photosState.folderContent) {
            const rootFolderId = props.authenticationState.user.root_folder_id

            props.dispatch(PhotoActions.getFolderContent(rootFolderId))
        }
    }, [])*/

    const isUploading = props.photosState.isUploadingPhotoName
    const isEmptyFolder = photoList.length === 0 && !isUploading

    useEffect(() => {
        //console.log('--- UPLOADING PROGRESS ON photoList ---', photosState.progress)

    }, [photosState.progress])


    const keyExtractor = (item: any, index: any) => index.toString();

    const renderAllPhotoItem = ({ item }: { item: IPhoto }) => (
        <Pressable
            onPress={() => { 
                props.navigation.navigate(props.title);
             }}
            onLongPress={() => {
                //props.dispatch(fileActions.selectPhoto(item))
            }}
            style={{
                display: "flex",
                flex: 1,
                backgroundColor: '#fff'
            }}
        >
            <PhotoItem isLoading={props.photosState.loading} item={item} />
        </Pressable>
    );

    console.log("PHOTO LIST   ", props.photos)


    return (
        <View>
            {
                isEmptyFolder ?
                    <EmptyFolder />
                    :
                    <Text style={styles.dNone}></Text>
            }


            <View style={styles.photoScroll}>
                <FlatList
                    keyExtractor={keyExtractor}
                    renderItem={renderAllPhotoItem}
                    data={props.photosState.photos}
                    horizontal={true}
                    showsHorizontalScrollIndicator={false}
                ></FlatList>
            </View>

        </View>
    )
}

const styles = StyleSheet.create({
    photoListContentsScrollView: {
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

export default connect(mapStateToProps)(PhotoList)