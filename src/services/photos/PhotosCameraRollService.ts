import CameraRoll from '@react-native-community/cameraroll';
import { Platform } from 'react-native';

export default class PhotosCameraRollService {
  public async count({ from, to }: { from?: Date; to?: Date }): Promise<number> {
    const PAGE_SIZE = 100;
    let hasNextPage = true;
    let cursor: string | undefined;
    let count = 0;

    do {
      const { edges, page_info } = await CameraRoll.getPhotos({
        first: PAGE_SIZE,
        after: cursor,
        fromTime: from && from.getTime(),
        toTime: to && to.getTime(),
        assetType: 'Photos',
        groupTypes: 'All',
      });

      hasNextPage = page_info.has_next_page;
      cursor = page_info.end_cursor;
      count += edges.length;
    } while (hasNextPage);

    return count;
  }

  public async loadLocalPhotos({
    from,
    to,
    limit,
    cursor,
  }: {
    from?: Date;
    to?: Date;
    limit: number;
    cursor?: string;
  }): Promise<[CameraRoll.PhotoIdentifier[], string | undefined]> {
    const photos = await CameraRoll.getPhotos({
      first: limit,
      /**
       * BE CAREFUL: fromTime is not being exclusive at least
       * on iOS as stated on the docs
       */
      fromTime: from && from.getTime(),
      toTime: to && to.getTime(),
      assetType: 'Photos',
      groupTypes: 'All',
      after: cursor,
      include: ['filename', 'fileSize', 'imageSize'],
    });
    let lastCursor: string | undefined = undefined;

    photos.edges.forEach((edge) => {
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
