import * as MediaLibrary from 'expo-media-library';
import { logger } from 'src/services/common';

const PAGE_SIZE = 1000;
const MEDIA_TYPES = [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video];

async function* streamAssets(
  options: Omit<MediaLibrary.AssetsOptions, 'first' | 'after'>,
): AsyncGenerator<MediaLibrary.Asset> {
  let cursor: string | undefined;
  do {
    const page = await MediaLibrary.getAssetsAsync({ first: PAGE_SIZE, after: cursor, ...options });
    yield* page.assets;
    cursor = page.hasNextPage ? page.endCursor : undefined;
  } while (cursor);
}

export const PhotoAssetScanner = {
  async getAssetsByIds(assetIds: string[]): Promise<MediaLibrary.Asset[]> {
    const pendingIdSet = new Set(assetIds);
    const resolvedAssets: MediaLibrary.Asset[] = [];

    for await (const asset of streamAssets({ mediaType: MEDIA_TYPES })) {
      if (pendingIdSet.has(asset.id)) {
        resolvedAssets.push(asset);
      }
      const hasFoundAllAssets = resolvedAssets.length === assetIds.length;
      if (hasFoundAllAssets) {
        break;
      }
    }

    return resolvedAssets;
  },

  async scanAll(): Promise<MediaLibrary.Asset[]> {
    const results: MediaLibrary.Asset[] = [];

    for await (const asset of streamAssets({
      mediaType: MEDIA_TYPES,
      sortBy: MediaLibrary.SortBy.modificationTime,
    })) {
      results.push(asset);
    }

    logger.info(`[PhotoAssetScanner] Scan complete — ${results.length} assets`);
    return results;
  },
};
