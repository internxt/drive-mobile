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
  onAssetDone?: (assetId: string, remoteFileId: string, modificationTime: number) => Promise<void> | void;
  onAssetError?: (assetId: string, error: Error) => Promise<void> | void;
}

let currentController: AbortController | null = null;

// TODO: MAKE IT CLASS
export const PhotoUploadQueue = {
  async start(
    jobs: AssetUploadJob[],
    deviceId: string,
    photosBucket: string,
    callbacks: UploadQueueCallbacks,
  ): Promise<void> {
    currentController = new AbortController();
    const { signal } = currentController;

    try {
      const limit = pLimit(UPLOAD_CONCURRENCY);

      await Promise.all(
        jobs.map((job) =>
          limit(async () => {
            if (signal.aborted) {
              return;
            }
            const { asset, existingRemoteFileId } = job;
            callbacks.onAssetStart?.(asset.id);

            try {
              const remoteFileId = existingRemoteFileId
                ? await PhotoUploadService.replace(
                    asset,
                    existingRemoteFileId,
                    deviceId,
                    photosBucket,
                    (ratio) => callbacks.onAssetProgress?.(asset.id, ratio),
                    signal,
                  )
                : await PhotoUploadService.upload(
                    asset,
                    deviceId,
                    photosBucket,
                    (ratio) => callbacks.onAssetProgress?.(asset.id, ratio),
                    signal,
                  );
              await callbacks.onAssetDone?.(asset.id, remoteFileId, asset.modificationTime);
            } catch (uploadError) {
              await callbacks.onAssetError?.(asset.id, uploadError as Error);
            }
          }),
        ),
      );
    } finally {
      if (currentController?.signal === signal) {
        currentController = null;
      }
    }
  },

  abortAll(): void {
    currentController?.abort();
  },
};
