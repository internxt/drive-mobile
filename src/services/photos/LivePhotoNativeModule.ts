import { NativeModules, Platform } from 'react-native';

interface LivePhotoComponents {
  photo: { uri: string; size: number; fileName: string };
  video: { uri: string; size: number; fileName: string };
}

interface PHAssetExportNative {
  exportLivePhotoComponents(localIdentifier: string): Promise<LivePhotoComponents>;
  saveLivePhoto(photoPath: string, videoPath: string): Promise<void>;
}

const nativeModule: PHAssetExportNative | null =
  Platform.OS === 'ios' ? (NativeModules.PHAssetExport as PHAssetExportNative) : null;

/**
 * Exports both components of an iOS Live Photo (photo + paired .mov) as raw resource bytes.
 *
 * @param localIdentifier - The `PHAsset.localIdentifier` of the Live Photo to export.
 * @returns Resolves with URIs, sizes, and filenames for both the photo and paired video components.
 * @throws If called on Android or if the asset cannot be exported.
 */
export const exportLivePhotoComponents = async (localIdentifier: string): Promise<LivePhotoComponents> => {
  if (!nativeModule) {
    throw new Error('exportLivePhotoComponents is only available on iOS');
  }
  return nativeModule.exportLivePhotoComponents(localIdentifier);
};

/**
 * Saves a photo + paired video as a real Live Photo in the iOS camera roll using
 * `PHAssetCreationRequest`. Both files must preserve their original Apple asset-identifier
 * metadata — this is guaranteed when they come from {@link exportLivePhotoComponents}.
 *
 * @param photoPath - Absolute path to the photo file (HEIC/JPEG).
 * @param videoPath - Absolute path to the paired video file (.mov).
 * @throws If called on Android or if the save operation fails.
 */
export const saveLivePhotoToLibrary = async (photoPath: string, videoPath: string): Promise<void> => {
  if (!nativeModule) {
    throw new Error('saveLivePhotoToLibrary is only available on iOS');
  }
  return nativeModule.saveLivePhoto(photoPath, videoPath);
};
