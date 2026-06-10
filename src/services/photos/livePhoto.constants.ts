import * as MediaLibrary from 'expo-media-library';

export const LIVE_PHOTO_PLAIN_NAME_SUFFIX = '.livephoto';
export const LIVE_PHOTO_VIDEO_TYPE = 'mov';

export const isPairedVideoPlainName = (plainName: string, type: string): boolean =>
  type.toLowerCase() === LIVE_PHOTO_VIDEO_TYPE && plainName.toLowerCase().endsWith(LIVE_PHOTO_PLAIN_NAME_SUFFIX);

export const getPhotoPlainNameFromPairedVideo = (videoPlainName: string): string =>
  videoPlainName.slice(0, -LIVE_PHOTO_PLAIN_NAME_SUFFIX.length);

export const getPairedVideoPlainNameFromPhoto = (photoPlainName: string): string =>
  `${photoPlainName}${LIVE_PHOTO_PLAIN_NAME_SUFFIX}`;

export const isLivePhotoAsset = (asset: MediaLibrary.Asset): boolean =>
  asset.mediaType === MediaLibrary.MediaType.photo && (asset.mediaSubtypes?.includes('livePhoto') ?? false);
