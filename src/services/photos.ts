import CameraRoll from '@react-native-community/cameraroll';
import { Platform } from 'react-native';

export const convertLocalIdentifierToAssetLibrary = (localIdentifier: string, ext: string): string => {
  const hash = localIdentifier.split('/')[0];

  return `assets-library://asset/asset.${ext}?id=${hash}&ext=${ext}`;
};

export async function loadLocalPhotos(cursor?: string): Promise<[CameraRoll.PhotoIdentifiersPage, string]> {
  const pictures = await CameraRoll.getPhotos({
    first: 10,
    assetType: 'All',
    groupTypes: 'All',
    after: cursor
  });

  let lastCursor: string = undefined;

  pictures.edges.map((edge) => {
    if (Platform.OS === 'ios') {
      lastCursor = edge.node.image.uri;
      edge.node.image.uri = convertLocalIdentifierToAssetLibrary(edge.node.image.uri.replace('ph://', ''), edge.node.type === 'image' ? 'jpg' : 'mov')
    }
    return
  })

  return [pictures, lastCursor];
}
