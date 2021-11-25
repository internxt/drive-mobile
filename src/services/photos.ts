import CameraRoll from '@react-native-community/cameraroll';
import { Platform } from 'react-native';

export const convertLocalIdentifierToAssetLibrary = (localIdentifier: string, ext: string): string => {
  const hash = localIdentifier.split('/')[0];

  return `assets-library://asset/asset.${ext}?id=${hash}&ext=${ext}`;
};

export async function loadLocalPhotos(cursor?: string): Promise<[CameraRoll.PhotoIdentifier[], string]> {
  const photos = await CameraRoll.getPhotos({
    first: 10,
    assetType: 'Photos',
    groupTypes: 'All',
    after: cursor,
  });
  let lastCursor: string = undefined;

  photos.edges.forEach((edge) => {
    if (Platform.OS === 'ios') {
      lastCursor = edge.node.image.uri;
      edge.node.image.uri = convertLocalIdentifierToAssetLibrary(
        edge.node.image.uri.replace('ph://', ''),
        edge.node.type === 'image' ? 'jpg' : 'mov',
      );
    }
    return;
  });

  console.log('photos: ', photos);

  return [photos.edges, lastCursor];
}
