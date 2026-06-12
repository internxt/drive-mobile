import { AssetInfo, MediaLibraryAssetInfoQueryOptions, getAssetInfoAsync } from 'expo-media-library';
import { stripUriFragment } from 'src/services/common/uri/uriHelpers';

export const photoMediaLibraryService = {
  /**
   * On iOS, `localUri` for video assets is `AVURLAsset.url.absoluteString`, which may carry a
   * binary-plist URL fragment (spatial-video metadata). It is stripped here so all consumers
   * receive a clean URI suitable for file I/O.
   */
  getAssetInfo: async (id: string, options?: MediaLibraryAssetInfoQueryOptions): Promise<AssetInfo> => {
    const info = await getAssetInfoAsync(id, options);
    return info.localUri ? { ...info, localUri: stripUriFragment(info.localUri) } : info;
  },
};
