import { NativeModules } from 'react-native';

export interface PendingShareFile {
  uri: string;
  name: string;
  size: number | null;
  phAssetId?: string; // iOS only: PHAsset localIdentifier
}

export interface PendingShareMetadata {
  files: PendingShareFile[];
  timestamp: number;
}

const ONE_HOUR_MS = 60 * 60 * 1000;
export const STALE_THRESHOLD_MS = 24 * ONE_HOUR_MS;

interface AppGroupPendingShareNativeModule {
  readPendingShare(): Promise<string | null>;
  clearPendingShare(): Promise<void>;
  writePendingShare(json: string): Promise<void>;
}

const AppGroupPendingShare = NativeModules.AppGroupPendingShare as AppGroupPendingShareNativeModule;

const isPendingShareMetadata = (value: unknown): value is PendingShareMetadata => {
  if (typeof value !== 'object' || value === null) return false;
  const valueAsObject = value as Record<string, unknown>;
  return Array.isArray(valueAsObject.files) && typeof valueAsObject.timestamp === 'number';
};

export const AppGroupPendingShareService = {
  read: async (): Promise<PendingShareMetadata | null> => {
    const json: string | null = await AppGroupPendingShare.readPendingShare();
    if (!json) {
      return null;
    }

    let parsedJSON: unknown;
    try {
      parsedJSON = JSON.parse(json);
    } catch {
      await AppGroupPendingShare.clearPendingShare().catch(() => undefined);
      return null;
    }
    if (!isPendingShareMetadata(parsedJSON)) {
      await AppGroupPendingShare.clearPendingShare().catch(() => undefined);
      return null;
    }
    return parsedJSON;
  },
  clear: (): Promise<void> => AppGroupPendingShare.clearPendingShare(),
  update: (metadata: PendingShareMetadata): Promise<void> =>
    AppGroupPendingShare.writePendingShare(JSON.stringify(metadata)),
  isStale: (metadata: PendingShareMetadata): boolean => Date.now() - metadata.timestamp > STALE_THRESHOLD_MS,
};
