import { ImageComponent, PermissionsAndroid, Platform } from "react-native";
import * as MediaLibrary from 'expo-media-library';
import * as Permissions from 'expo-permissions';
//import * as ImageManipulator from 'expo-image-manipulator';
import { useDispatch, useSelector } from "react-redux";
import { previewsStorage } from "./previewsStorage";

function hasMediaAccessPermissions() {
    return MediaLibrary.requestPermissionsAsync().then((res) => {
        if (res.status !== 'granted') {
            console.log("[MEDIALIBRARY] Media device access denied.");
            return false;
        }

        return res.granted;
    }).catch((err) => { console.log("[MEDIALIBRARY]", err); return false; })
}

/*export async function generateThumbnail (uri: string) {
    const manipImg = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 110 }}],
        {
            base64: false
        }
    )

    //console.log('data:image/jpg;base64' + manipImg.base64)
    return manipImg;
}*/


export async function getPhotos(rootAlbumId:any, cursor: string) {
    let data;

    const hasPermission = await hasMediaAccessPermissions();

    if (!hasPermission) {
        const permission = await MediaLibrary.requestPermissionsAsync();

        if (permission.status !== 'granted') {
            console.log("[PERMISSIONS] No permissions to get photos.");
            return;
        }
    }

    data = await MediaLibrary.getAssetsAsync({
        sortBy: [MediaLibrary.SortBy.creationTime],
        first: 20,
        after: cursor.toString()
    });


    var photos: any[] = [];

    data.assets.map(async (asset: any) => {


        let photo: any = {
            name: asset.filename,
            type: asset.mediaType,
            height: asset.height,
            width: asset.width,
            createdAt: asset.creationTime,
            uri: asset.uri,
            bucketId: rootAlbumId
        }

        photos.push(photo)
    })

    return { photos: photos, index: cursor };
}


async function savePhoto(picUri: string) {
    if (!hasMediaAccessPermissions()) {
        console.log("[MEDIALIBRARY] No permissions to save photos.");
        return;
    }

    await MediaLibrary.saveToLibraryAsync(picUri);
}