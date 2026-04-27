import * as MediaLibrary from 'expo-media-library';
import { logger } from 'src/services/common';

export const PhotoAssetScanner = {
  async scanAll(): Promise<MediaLibrary.Asset[]> {
    const results: MediaLibrary.Asset[] = [];
    let cursor: string | undefined;

    do {
      const batch = await MediaLibrary.getAssetsAsync({
        first: 200,
        after: cursor,
        mediaType: [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video],
        sortBy: MediaLibrary.SortBy.modificationTime,
      });
      results.push(...batch.assets);
      cursor = batch.hasNextPage ? batch.endCursor : undefined;
    } while (cursor);

    logger.info(`[PhotoAssetScanner] Scan complete — ${results.length} assets`);
    return results;
  },
};
