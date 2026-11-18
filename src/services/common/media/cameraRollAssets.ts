import { NativeModules } from 'react-native';

export interface PickedPhotoAsset {
  localIdentifier: string;
}

export interface ExportedPhAsset {
  uri: string;
  size: number;
  fileName: string;
}

interface PhotoPickerNativeModule {
  pickAssets(options: { selectionLimit: number }): Promise<PickedPhotoAsset[]>;
}

interface PHAssetExportNativeModule {
  exportAsset(localIdentifier: string): Promise<ExportedPhAsset>;
}

const PhotoPicker = NativeModules.PhotoPicker as PhotoPickerNativeModule;
const PHAssetExport = NativeModules.PHAssetExport as PHAssetExportNativeModule;

export const pickPhotoAssets = (selectionLimit: number): Promise<PickedPhotoAsset[]> =>
  PhotoPicker.pickAssets({ selectionLimit });

export const exportPhAsset = (localIdentifier: string): Promise<ExportedPhAsset> =>
  PHAssetExport.exportAsset(localIdentifier);

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export const withRetry = async <T>(fn: () => Promise<T>, attempts = 3, baseDelayMs = 800): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await delay(baseDelayMs * attempt);
      }
    }
  }

  throw lastError;
};
