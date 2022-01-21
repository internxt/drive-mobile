import CameraRoll from '@react-native-community/cameraroll';
import { Platform } from 'react-native';
import PhotosLogService from './PhotosLogService';

export default class PhotosCameraRollService {
  private readonly logService: PhotosLogService;

  constructor(logService: PhotosLogService) {
    this.logService = logService;
  }

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
    const { edges, page_info } = await CameraRoll.getPhotos({
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

    edges.forEach((edge) => {
      if (Platform.OS === 'ios') {
        edge.node.image.uri = this.convertLocalIdentifierToAssetLibrary(
          edge.node.image.uri.replace('ph://', ''),
          edge.node.type === 'image' ? 'jpg' : 'mov',
        );
      }
    });

    return [edges, page_info.end_cursor];
  }

  private convertLocalIdentifierToAssetLibrary(localIdentifier: string, ext: string): string {
    const hash = localIdentifier.split('/')[0];

    return `assets-library://asset/asset.${ext}?id=${hash}&ext=${ext}`;
  }
}
