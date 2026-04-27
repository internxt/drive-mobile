import * as MediaLibrary from 'expo-media-library';
import { photosLocalDB } from './database/photosLocalDB';

export const PhotoDeduplicator = {
  async filter(assets: MediaLibrary.Asset[]): Promise<MediaLibrary.Asset[]> {
    if (assets.length === 0) return [];
    const syncedIds = await photosLocalDB.getSyncedIds(assets.map((asset) => asset.id));
    return assets.filter((asset) => !syncedIds.has(asset.id));
  },
};
