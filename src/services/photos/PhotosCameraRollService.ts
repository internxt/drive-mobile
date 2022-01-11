import CameraRoll from '@react-native-community/cameraroll';
import { Platform } from 'react-native';

export default class PhotosCameraRollService {
  public async loadLocalPhotos(
    from: Date,
    to: Date,
    limit: number,
    cursor?: string,
  ): Promise<[CameraRoll.PhotoIdentifier[], string | undefined]> {
    const photos = await CameraRoll.getPhotos({
      first: limit,
      /**
       * BE CAREFUL: fromTime is not being exclusive at least
       * on iOS as stated on the docs
       */
      fromTime: from.getTime(),
      toTime: to.getTime(),
      assetType: 'Photos',
      groupTypes: 'All',
      after: cursor,
      include: ['filename', 'fileSize', 'imageSize'],
    });
    let lastCursor: string | undefined = undefined;

    photos.edges.reverse().forEach((edge) => {
      if (Platform.OS === 'ios') {
        lastCursor = edge.node.image.uri;
        edge.node.image.uri = this.convertLocalIdentifierToAssetLibrary(
          edge.node.image.uri.replace('ph://', ''),
          edge.node.type === 'image' ? 'jpg' : 'mov',
        );
      }
    });

    return [photos.edges, lastCursor];
  }

  private convertLocalIdentifierToAssetLibrary(localIdentifier: string, ext: string): string {
    const hash = localIdentifier.split('/')[0];

    return `assets-library://asset/asset.${ext}?id=${hash}&ext=${ext}`;
  }
}
