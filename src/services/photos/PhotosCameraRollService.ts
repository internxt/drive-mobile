import CameraRoll from '@react-native-community/cameraroll';
import { Platform } from 'react-native';
import PhotosLocalDatabaseService from './PhotosLocalDatabaseService';
import PhotosLogService from './PhotosLogService';

export default class PhotosCameraRollService {
  private readonly logService: PhotosLogService;
  private readonly localDatabaseService: PhotosLocalDatabaseService;

  constructor(logService: PhotosLogService, localDatabaseService: PhotosLocalDatabaseService) {
    this.logService = logService;
    this.localDatabaseService = localDatabaseService;
  }

  public async count({ from, to }: { from?: Date; to?: Date }): Promise<number> {
    let hasNextPage = true;
    let cursor: string | undefined;
    let count = 0;

    do {
      const { edges, page_info } = await this.getPhotos({
        limit: 100,
        cursor,
        from,
        to,
      });

      hasNextPage = page_info.has_next_page;
      cursor = page_info.end_cursor;
      count += edges.length;
    } while (hasNextPage);

    return count;
  }

  /**
   * @description Copies all the camera roll photos sqlite.
   * !!! We use this to avoid sort by date errors found in the library @react-native-community/cameraroll
   * !!! https://github.com/react-native-cameraroll/react-native-cameraroll/issues/372
   */
  public async copyToLocalDatabase(): Promise<{ count: number }> {
    const limit = Platform.OS === 'android' ? 120 : 10000;
    let hasNextPage = false;
    let cursor: string | undefined;
    let count = 0;

    await this.localDatabaseService.cleanTmpCameraRollTable();

    do {
      const { edges, page_info } = await this.getPhotos({
        limit,
        cursor,
      });

      hasNextPage = page_info.has_next_page;
      cursor = page_info.end_cursor;

      await this.localDatabaseService.bulkInsertTmpCameraRollRow(edges);
      count += edges.length;
    } while (hasNextPage);

    return { count };
  }

  public async getPhotos({
    from,
    to,
    limit,
    cursor,
  }: {
    from?: Date;
    to?: Date;
    limit: number;
    cursor?: string;
  }): Promise<{
    edges: CameraRoll.PhotoIdentifier[];
    page_info: { has_next_page: boolean; start_cursor?: string | undefined; end_cursor?: string | undefined };
  }> {
    const { edges, page_info } = await CameraRoll.getPhotos({
      first: limit,
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

    return {
      edges,
      page_info,
    };
  }

  private convertLocalIdentifierToAssetLibrary(localIdentifier: string, ext: string): string {
    const hash = localIdentifier.split('/')[0];

    return `assets-library://asset/asset.${ext}?id=${hash}&ext=${ext}`;
  }
}
