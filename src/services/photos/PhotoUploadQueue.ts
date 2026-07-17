import * as MediaLibrary from 'expo-media-library';
import pLimit from 'p-limit';
import { PhotoUploadEvent, PhotoUploadResult, PhotoUploadService } from './PhotoUploadService';

const UPLOAD_CONCURRENCY = 3;

export interface AssetUploadJob {
  asset: MediaLibrary.Asset;
  existingRemoteFileId?: string;
}

interface UploadQueueCallbacks {
  onAssetStart?: (assetId: string) => void;
  onAssetProgress?: (assetId: string, ratio: number) => void;
  onAssetDone?: (assetId: string, result: PhotoUploadResult, modificationTime: number) => Promise<void> | void;
  onAssetError?: (assetId: string, error: Error) => Promise<void> | void;
  onAssetEvent?: (assetId: string, event: PhotoUploadEvent) => void;
}

let currentController: AbortController | null = null;

interface PromiseWithResolvers<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
}

// Local stand-in for ES2024 Promise.withResolvers(), which Hermes doesn't support yet.
const promiseWithResolvers = <T = void>(): PromiseWithResolvers<T> => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

let currentCycleEnd: PromiseWithResolvers<void> | null = null;

// TODO: MAKE IT CLASS
export const PhotoUploadQueue = {
  beginCycle(): AbortSignal {
    currentController = new AbortController();
    currentCycleEnd = promiseWithResolvers();
    return currentController.signal;
  },

  endCycle(): void {
    currentController = null;
    currentCycleEnd?.resolve();
    currentCycleEnd = null;
  },

  isCycleRunning(): boolean {
    return currentCycleEnd !== null;
  },

  /**
   * Resolves once the current cycle ends, or immediately if none is running.
   * With `timeoutMs`, resolves after that long even if the cycle has not ended.
   */
  waitForCycleEnd(timeoutMs?: number): Promise<void> {
    if (!currentCycleEnd) {
      return Promise.resolve();
    }
    const cycleEndPromise = currentCycleEnd.promise;
    if (timeoutMs === undefined) {
      return cycleEndPromise;
    }
    let timeoutHandle: ReturnType<typeof setTimeout>;
    const timedOut = new Promise<void>((res) => {
      timeoutHandle = setTimeout(res, timeoutMs);
    });
    return Promise.race([cycleEndPromise.finally(() => clearTimeout(timeoutHandle)), timedOut]);
  },

  async start(
    jobs: AssetUploadJob[],
    deviceId: string,
    photosBucket: string,
    callbacks: UploadQueueCallbacks,
    externalAbortSignal?: AbortSignal,
  ): Promise<void> {
    if (externalAbortSignal) {
      return PhotoUploadQueue.runJobs(jobs, deviceId, photosBucket, callbacks, externalAbortSignal);
    }

    currentController = currentController ?? new AbortController();
    const { signal } = currentController;

    try {
      await PhotoUploadQueue.runJobs(jobs, deviceId, photosBucket, callbacks, signal);
    } finally {
      if (currentController?.signal === signal) {
        currentController = null;
      }
    }
  },

  async runJobs(
    jobs: AssetUploadJob[],
    deviceId: string,
    photosBucket: string,
    callbacks: UploadQueueCallbacks,
    signal: AbortSignal,
  ): Promise<void> {
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
            const uploadOptions = {
              onProgress: (ratio: number) => callbacks.onAssetProgress?.(asset.id, ratio),
              signal,
              onEvent: (event: PhotoUploadEvent) => callbacks.onAssetEvent?.(asset.id, event),
            };
            const photoUploadResult = existingRemoteFileId
              ? await PhotoUploadService.replace(asset, existingRemoteFileId, deviceId, photosBucket, uploadOptions)
              : await PhotoUploadService.upload(asset, deviceId, photosBucket, uploadOptions);
            await callbacks.onAssetDone?.(asset.id, photoUploadResult, asset.modificationTime);
          } catch (uploadError) {
            await callbacks.onAssetError?.(asset.id, uploadError as Error);
          }
        }),
      ),
    );
  },

  abortAll(): void {
    currentController?.abort();
  },
};
