import { CloudPhotoItem } from 'src/screens/PhotosScreen/types';
import { logger } from 'src/services/common';
import { stripFileUri } from 'src/services/common/uri/uriHelpers';
import { photosLocalDB } from '../database/photosLocalDB';
import { PhotoAssetFetchService } from '../PhotoAssetFetchService';
import { BurstNativeModule } from './BurstNativeModule';

const entryToCloudPhotoItem = (entry: {
  remoteFileId: string;
  fileName: string;
  thumbnailPath: string | null;
  thumbnailBucketId: string | null;
  thumbnailBucketFile: string | null;
  thumbnailType: string | null;
  deviceId: string;
  createdAt: number;
}): CloudPhotoItem => ({
  id: entry.remoteFileId,
  type: 'cloud-only',
  mediaType: 'photo',
  thumbnailPath: entry.thumbnailPath,
  thumbnailBucketId: entry.thumbnailBucketId,
  thumbnailBucketFile: entry.thumbnailBucketFile,
  thumbnailType: entry.thumbnailType,
  deviceId: entry.deviceId,
  createdAt: entry.createdAt,
  fileName: entry.fileName,
});

/**
 * Handles downloading and restoring burst photo groups from the cloud to the device photo library.
 */
export const BurstFetchService = {
  /**
   * Downloads the burst representative and all its members, then calls the native
   * `saveBurst` to reconstruct the burst group in the device photo library.
   *
   * If no member entries are found in the local DB (e.g. cloud sync hasn't linked them yet),
   * only the representative is restored and a warning is logged — the call still succeeds.
   *
   * @param item - The representative `CloudPhotoItem` for the burst group. Must have `burstGroupId` set.
   * @param signal - `AbortSignal` used to cancel in-flight downloads; returns `false` immediately if aborted.
   * @returns `true` on success, `false` if aborted, if `burstGroupId` is missing, or if any member URI could not be resolved.
   */
  saveBurstToDevice: async (item: CloudPhotoItem, signal: AbortSignal): Promise<boolean> => {
    if (!item.burstGroupId) return false;

    const memberEntries = await photosLocalDB.getBurstMembers(item.burstGroupId);
    if (memberEntries.length === 0) {
      logger.warn(`[BurstFetch] No members found for burst group ${item.burstGroupId} — restoring representative only`);
    }

    const allItems: CloudPhotoItem[] = [item, ...memberEntries.map(entryToCloudPhotoItem)];

    const uriResults = await Promise.all(allItems.map((i) => PhotoAssetFetchService.fetchUri(i, signal)));

    if (signal.aborted) {
      return false;
    }

    const paths: string[] = [];
    for (const uri of uriResults) {
      if (!uri) {
        return false;
      }
      // saveBurst needs raw paths (no file:// prefix), same as saveLivePhoto pattern.
      paths.push(stripFileUri(uri));
    }

    await BurstNativeModule.saveBurst(paths);
    return true;
  },
};
