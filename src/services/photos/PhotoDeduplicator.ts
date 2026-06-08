import * as MediaLibrary from 'expo-media-library';
import { photosLocalDB } from './database/photosLocalDB';

const hasBeenEdited = (asset: MediaLibrary.Asset, syncedModificationTime: number | null): boolean => {
  if (syncedModificationTime === null) {
    return false;
  }
  const isEditedAsset = asset.modificationTime > syncedModificationTime;
  return isEditedAsset;
};

export interface AssetsToSync {
  newAssets: MediaLibrary.Asset[];
  editedAssets: MediaLibrary.Asset[];
}

export const PhotoDeduplicator = {
  async getAssetsToSync(assets: MediaLibrary.Asset[]): Promise<AssetsToSync> {
    if (assets.length === 0) {
      return { newAssets: [], editedAssets: [] };
    }

    const [syncedEntries, deletedIds] = await Promise.all([
      photosLocalDB.getSyncedEntries(assets.map((asset) => asset.id)),
      photosLocalDB.getDeletedAssetIds(),
    ]);

    const newAssets: MediaLibrary.Asset[] = [];
    const editedAssets: MediaLibrary.Asset[] = [];

    for (const asset of assets) {
      const skipBecauseDeleted = deletedIds.has(asset.id);
      if (skipBecauseDeleted) {
        continue;
      }
      const syncedInfo = syncedEntries.get(asset.id);
      if (!syncedInfo) {
        newAssets.push(asset);
      } else if (syncedInfo.status === 'cloud_deleted') {
        if (hasBeenEdited(asset, syncedInfo.modificationTime)) {
          newAssets.push(asset);
        }
      } else if (hasBeenEdited(asset, syncedInfo.modificationTime)) {
        editedAssets.push(asset);
      }
    }

    return { newAssets, editedAssets };
  },
};
