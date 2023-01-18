import fileSystemService from '../FileSystemService';
import { PHOTOS_FULL_SIZE_DIRECTORY, PHOTOS_PREVIEWS_DIRECTORY, PHOTOS_ROOT_DIRECTORY } from './constants';
import { photosEvents } from './events';
import { photosRealmDB } from './database';
import { photosLogger } from './logger';
import { photosUsage } from './usage';
import { photosUser } from './user';
import { photosUtils } from './utils';
import { photosPreview } from './preview';
import { photosLocalSync, photosRemoteSync } from './sync';
import { photosNetwork } from './network/photosNetwork.service';
import asyncStorageService from '../AsyncStorageService';
import { AsyncStorageKey } from '@internxt-mobile/types/index';
import { photosAnalytics } from './analytics/photosAnalytics';

const photos = {
  clear: async () => {
    await photosRealmDB.clear();
    await fileSystemService.unlinkIfExists(PHOTOS_ROOT_DIRECTORY);
    await asyncStorageService.deleteItem(AsyncStorageKey.LastPhotoPulledDate);
    photosLogger.info('Photos system clear');
  },
  start: async () => {
    await photosRealmDB.init();
    await fileSystemService.mkdir(PHOTOS_FULL_SIZE_DIRECTORY);
    await fileSystemService.mkdir(PHOTOS_PREVIEWS_DIRECTORY);
  },
  events: photosEvents,
  preview: photosPreview,
  realm: photosRealmDB,
  logger: photosLogger,
  usage: photosUsage,
  user: photosUser,
  utils: photosUtils,
  localSync: photosLocalSync,
  remoteSync: photosRemoteSync,
  network: photosNetwork,
  analytics: photosAnalytics,
};
export default photos;
