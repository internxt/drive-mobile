import * as MediaLibrary from 'expo-media-library';
import {
  getPairedVideoPlainNameFromPhoto,
  getPhotoPlainNameFromPairedVideo,
  isLivePhotoAsset,
  isPairedVideoPlainName,
  LIVE_PHOTO_PLAIN_NAME_SUFFIX,
} from './livePhoto.constants';

describe('when checking whether a file is a Live Photo paired video', () => {
  test('when the type is mov and the plain name ends with the live photo suffix, then it is a paired video', () => {
    expect(isPairedVideoPlainName('IMG_1234.livephoto', 'mov')).toBe(true);
  });

  test('when the suffix and type are uppercase, then case is ignored', () => {
    expect(isPairedVideoPlainName('IMG_1234.LIVEPHOTO', 'MOV')).toBe(true);
  });

  test('when the type is mov but the plain name has no suffix, then it is not a paired video', () => {
    expect(isPairedVideoPlainName('IMG_1234', 'mov')).toBe(false);
  });

  test('when the type is mp4 with the suffix, then it is not a paired video', () => {
    expect(isPairedVideoPlainName('clip.livephoto', 'mp4')).toBe(false);
  });

  test('when the type is heic and the plain name has the suffix, then it is not a paired video', () => {
    expect(isPairedVideoPlainName('IMG_1234.livephoto', 'heic')).toBe(false);
  });

  test('when a user file happens to be named with the suffix but has a different type, then it is not a paired video', () => {
    expect(isPairedVideoPlainName('myvideo.livephoto', 'avi')).toBe(false);
  });

  test('when the plain name only contains the suffix itself, then it is still identified as a paired video', () => {
    // Edge: someone named the file exactly ".livephoto"
    expect(isPairedVideoPlainName(LIVE_PHOTO_PLAIN_NAME_SUFFIX, 'mov')).toBe(true);
  });
});

describe('when converting between photo and paired-video plain names', () => {
  test('when given a photo plain name, then adding and removing the suffix produces the original name', () => {
    const photoName = 'IMG_1234';
    expect(getPhotoPlainNameFromPairedVideo(getPairedVideoPlainNameFromPhoto(photoName))).toBe(photoName);
  });

  test('when given a paired video plain name, then removing and re-adding the suffix produces the original name', () => {
    const videoName = 'IMG_5678.livephoto';
    expect(getPairedVideoPlainNameFromPhoto(getPhotoPlainNameFromPairedVideo(videoName))).toBe(videoName);
  });

  test('when converting a typical photo name to a paired video name, then the suffix is appended correctly', () => {
    expect(getPairedVideoPlainNameFromPhoto('IMG_9999')).toBe('IMG_9999.livephoto');
  });

  test('when recovering the photo name from a paired video plain name, then the suffix is stripped correctly', () => {
    expect(getPhotoPlainNameFromPairedVideo('IMG_9999.livephoto')).toBe('IMG_9999');
  });

  test('when the photo name already contains dots, then only the suffix is affected', () => {
    const photoName = 'my.album.photo';
    const videoName = getPairedVideoPlainNameFromPhoto(photoName);
    expect(videoName).toBe('my.album.photo.livephoto');
    expect(getPhotoPlainNameFromPairedVideo(videoName)).toBe(photoName);
  });
});

const makeAsset = (overrides: Partial<MediaLibrary.Asset> = {}): MediaLibrary.Asset =>
  ({
    id: 'asset-1',
    uri: 'ph://asset-1',
    mediaType: MediaLibrary.MediaType.photo,
    mediaSubtypes: [],
    filename: 'IMG_0001.heic',
    width: 3024,
    height: 4032,
    fileSize: 4_000_000,
    creationTime: Date.now(),
    modificationTime: Date.now(),
    duration: 0,
    albumId: undefined,
    ...overrides,
  }) as MediaLibrary.Asset;

describe('when determining whether a device asset is a Live Photo', () => {
  test('when the asset is a photo with the livePhoto subtype, then it is a Live Photo', () => {
    const asset = makeAsset({ mediaSubtypes: ['livePhoto'] });
    expect(isLivePhotoAsset(asset)).toBe(true);
  });

  test('when the asset is a photo with multiple subtypes including livePhoto, then it is a Live Photo', () => {
    const asset = makeAsset({ mediaSubtypes: ['hdr', 'livePhoto'] });
    expect(isLivePhotoAsset(asset)).toBe(true);
  });

  test('when the asset is a photo with no subtypes, then it is not a Live Photo', () => {
    const asset = makeAsset({ mediaSubtypes: [] });
    expect(isLivePhotoAsset(asset)).toBe(false);
  });

  test('when the asset has a livePhoto subtype but is a video, then it is not a Live Photo', () => {
    // Use string literal: in Jest the native module is mocked and MediaType.video can be undefined.
    const asset = makeAsset({ mediaType: 'video' as MediaLibrary.MediaTypeValue, mediaSubtypes: ['livePhoto'] });
    expect(isLivePhotoAsset(asset)).toBe(false);
  });

  test('when the asset mediaSubtypes field is undefined, then it is not a Live Photo', () => {
    const asset = makeAsset({ mediaSubtypes: undefined });
    expect(isLivePhotoAsset(asset)).toBe(false);
  });

  test('when the asset is an audio file with the livePhoto subtype, then it is not a Live Photo', () => {
    // Use string literal: in Jest the native module is mocked and MediaType.audio can be undefined.
    const asset = makeAsset({ mediaType: 'audio' as MediaLibrary.MediaTypeValue, mediaSubtypes: ['livePhoto'] });
    expect(isLivePhotoAsset(asset)).toBe(false);
  });
});
