import * as MediaLibrary from 'expo-media-library';
import { logger } from 'src/services/common';

const PAGE_SIZE = 200;
const MEDIA_TYPES = [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video];

// onAssetFetched returns true to stop pagination early
const paginateAssets = async (
  options: Omit<MediaLibrary.AssetsOptions, 'first' | 'after'>,
  onAssetFetched: (asset: MediaLibrary.Asset) => boolean,
): Promise<void> => {
  let cursor: string | undefined;
  do {
    const page = await MediaLibrary.getAssetsAsync({ first: PAGE_SIZE, after: cursor, ...options });
    for (const asset of page.assets) {
      if (onAssetFetched(asset)) return;
    }
    cursor = page.hasNextPage ? page.endCursor : undefined;
  } while (cursor);
};

export const PhotoAssetScanner = {
  async getAssetsByIds(assetIds: string[]): Promise<MediaLibrary.Asset[]> {
    const pendingIdSet = new Set(assetIds);
    const resolvedAssets: MediaLibrary.Asset[] = [];

    await paginateAssets({ mediaType: MEDIA_TYPES }, (asset) => {
      if (pendingIdSet.has(asset.id)) resolvedAssets.push(asset);
      return resolvedAssets.length === assetIds.length;
    });

    return resolvedAssets;
  },

  async scanAll(): Promise<MediaLibrary.Asset[]> {
    const results: MediaLibrary.Asset[] = [];

    await paginateAssets({ mediaType: MEDIA_TYPES, sortBy: MediaLibrary.SortBy.modificationTime }, (asset) => {
      results.push(asset);
      return false; // never stop early — collect all
    });

    logger.info(`[PhotoAssetScanner] Scan complete — ${results.length} assets`);
    return results;
  },
};
