import * as MediaLibrary from 'expo-media-library';

// The suffix appended to the photo's plainName when uploading the paired Live Photo video.
// Example: photo "IMG_1234.heic" → video "IMG_1234.livephoto.mov" in the same day folder.
// Self-correcting: a *.livephoto.mov with no matching photo sibling is treated as a regular video.
export const LIVE_PHOTO_PLAIN_NAME_SUFFIX = '.livephoto';
export const LIVE_PHOTO_VIDEO_TYPE = 'mov';

// Returns true when a file (identified by plainName + type) is a Live Photo paired video.
export const isPairedVideoPlainName = (plainName: string, type: string): boolean =>
  type.toLowerCase() === LIVE_PHOTO_VIDEO_TYPE && plainName.toLowerCase().endsWith(LIVE_PHOTO_PLAIN_NAME_SUFFIX);

// Given the plainName of the paired video (e.g. "IMG_1234.livephoto"), returns the photo's plainName ("IMG_1234").
export const getPhotoPlainNameFromPairedVideo = (videoPlainName: string): string =>
  videoPlainName.slice(0, -LIVE_PHOTO_PLAIN_NAME_SUFFIX.length);

// Given the photo's plainName (e.g. "IMG_1234"), returns the paired video's plainName ("IMG_1234.livephoto").
export const getPairedVideoPlainNameFromPhoto = (photoPlainName: string): string =>
  `${photoPlainName}${LIVE_PHOTO_PLAIN_NAME_SUFFIX}`;

// Returns true when a MediaLibrary asset is an iOS Live Photo.
// getAssetsAsync populates mediaSubtypes, so this is cheap (no extra getAssetInfoAsync call needed).
export const isLivePhotoAsset = (asset: MediaLibrary.Asset): boolean =>
  asset.mediaType === MediaLibrary.MediaType.photo && (asset.mediaSubtypes?.includes('livePhoto') ?? false);
