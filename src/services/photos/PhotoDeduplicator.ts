import * as MediaLibrary from 'expo-media-library';
import { photosLocalDB } from './database/photosLocalDB';

const hasBeenEdited = (asset: MediaLibrary.Asset, syncedModificationTime: number | null): boolean => {
  if (syncedModificationTime !== null && asset.modificationTime > syncedModificationTime) {
    return true;
  }
  return false;
};

export const PhotoDeduplicator = {
  async getAssetsToSync(assets: MediaLibrary.Asset[]): Promise<MediaLibrary.Asset[]> {
    if (assets.length === 0) return [];
    const syncedEntries = await photosLocalDB.getSyncedEntries(assets.map((asset) => asset.id));

    const uniqueAssets = assets.filter((asset) => {
      const syncedInfo = syncedEntries.get(asset.id);
      if (!syncedInfo) {
        return true;
      }
      return hasBeenEdited(asset, syncedInfo.modificationTime);
    });

    return uniqueAssets;
  },
};
