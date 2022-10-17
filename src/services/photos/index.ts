import fileSystemService from '../FileSystemService';
import { PHOTOS_FULL_SIZE_DIRECTORY, PHOTOS_PREVIEWS_DIRECTORY, PHOTOS_ROOT_DIRECTORY } from './constants';
import { photosEvents } from './events';
import { photosLocalDB } from './database';
import { photosLogger } from './logger';
import { photosUsage } from './usage';
import { photosUser } from './user';
import { photosUtils } from './utils';
import { photosPreview } from './preview';
import { photosSync } from './sync';
import { photosNetwork } from './network/photosNetwork.service';
import asyncStorageService from '../AsyncStorageService';
import { AsyncStorageKey } from '@internxt-mobile/types/index';
import { photosAnalytics } from './analytics/photosAnalytics';

const photos = {
  clear: async () => {
    await photosLocalDB.clear();
    await fileSystemService.unlinkIfExists(PHOTOS_ROOT_DIRECTORY);
    await asyncStorageService.deleteItem(AsyncStorageKey.LastPhotosPagePulled);
    photosLogger.info('Photos system clear');
  },
  start: async () => {
    await fileSystemService.mkdir(PHOTOS_FULL_SIZE_DIRECTORY);
    await fileSystemService.mkdir(PHOTOS_PREVIEWS_DIRECTORY);
  },
  events: photosEvents,
  preview: photosPreview,
  database: photosLocalDB,
  logger: photosLogger,
  usage: photosUsage,
  user: photosUser,
  utils: photosUtils,
  sync: photosSync,
  network: photosNetwork,
  analytics: photosAnalytics,
};
export default photos;
