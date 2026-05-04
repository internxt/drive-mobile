import * as MediaLibrary from 'expo-media-library';
import pLimit from 'p-limit';
import { PhotoUploadService } from './PhotoUploadService';

const UPLOAD_CONCURRENCY = 3;

export interface AssetUploadJob {
  asset: MediaLibrary.Asset;
  existingRemoteFileId?: string;
}

interface UploadQueueCallbacks {
  onAssetStart?: (assetId: string) => void;
  onAssetProgress?: (assetId: string, ratio: number) => void;
  onAssetDone?: (assetId: string, remoteFileId: string, modificationTime: number) => void;
  onAssetError?: (assetId: string, error: Error) => void;
}

export const PhotoUploadQueue = {
  async start(
    jobs: AssetUploadJob[],
    deviceId: string,
    callbacks: UploadQueueCallbacks,
  ): Promise<void> {
    const limit = pLimit(UPLOAD_CONCURRENCY);

    await Promise.all(
      jobs.map((job) =>
        limit(async () => {
          const { asset, existingRemoteFileId } = job;
          callbacks.onAssetStart?.(asset.id);
          try {
            const remoteFileId = existingRemoteFileId
              ? await PhotoUploadService.replace(asset, existingRemoteFileId, deviceId, (ratio) =>
                  callbacks.onAssetProgress?.(asset.id, ratio),
                )
              : await PhotoUploadService.upload(asset, deviceId, (ratio) =>
                  callbacks.onAssetProgress?.(asset.id, ratio),
                );
            callbacks.onAssetDone?.(asset.id, remoteFileId, asset.modificationTime);
          } catch (uploadError) {
            callbacks.onAssetError?.(asset.id, uploadError as Error);
          }
        }),
      ),
    );
  },
};
