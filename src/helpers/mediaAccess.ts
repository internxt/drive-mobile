import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { previewsStorage } from './previewsStorage';

function hasMediaAccessPermissions() {
  return MediaLibrary.requestPermissionsAsync().then((res) => {
    if (res.status !== 'granted') {
      return false;
    }

    return res.granted;
  }).catch((err) => { return false; })
}

export async function getDevicePhotos(rootAlbumId: any, cursor: string) {
  const hasPermission = await hasMediaAccessPermissions();

  if (!hasPermission) {
    const permission = await MediaLibrary.requestPermissionsAsync();

    if (permission.status !== 'granted') {
      return;
    }
  }

  const data = await MediaLibrary.getAssetsAsync({
    sortBy: [MediaLibrary.SortBy.creationTime],
    first: 20,
    after: cursor.toString()
  });

  previewsStorage.existsPreviewFolder();
  const photos = await Promise.all(data.assets.map(async (asset: any) => {
    const preview = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: { width: 220 } }],
      { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
    )

    await FileSystem.copyAsync({
      from: preview.uri,
      to: FileSystem.documentDirectory + 'previews/' + asset.filename
    });

    const newDevicePhoto = {
      name: asset.filename,
      type: asset.mediaType,
      height: asset.height,
      width: asset.width,
      createdAt: asset.creationTime,
      uri: asset.uri,
      preview: FileSystem.documentDirectory + 'previews/' + asset.filename,
      bucketId: rootAlbumId
    };

    return newDevicePhoto;
  }));

  // const previews = await previewsStorage.getPreviews();

  return { photos: photos, index: data.endCursor };
}

async function savePhoto(picUri: string) {
  if (!hasMediaAccessPermissions()) {
    return;
  }

  await MediaLibrary.saveToLibraryAsync(picUri);
}