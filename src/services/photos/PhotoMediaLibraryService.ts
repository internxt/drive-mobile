import { AssetInfo, MediaLibraryAssetInfoQueryOptions, getAssetInfoAsync } from 'expo-media-library';

export const photoMediaLibraryService = {
  getAssetInfo: (id: string, options?: MediaLibraryAssetInfoQueryOptions): Promise<AssetInfo> =>
    getAssetInfoAsync(id, options),
};
