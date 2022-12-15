import { driveShareService } from './share';
import { driveUsageService } from './usage';
import { driveEvents } from './events';
import { driveRecentsService } from './recents';
import { driveLogger } from './logger';
import { driveLocalDB } from './database';
import { driveFileCache, driveFileService } from './file';
import { driveFolderService } from './folder';
import { driveTrashService } from './trash';
import fileSystemService from '../FileSystemService';
import { DRIVE_CACHE_DIRECTORY, DRIVE_ROOT_DIRECTORY, DRIVE_THUMBNAILS_DIRECTORY } from './constants';

export default {
  logger: driveLogger,
  recents: driveRecentsService,
  share: driveShareService,
  usage: driveUsageService,
  database: driveLocalDB,
  events: driveEvents,
  folder: driveFolderService,
  file: driveFileService,
  trash: driveTrashService,
  cache: driveFileCache,
  clear: async () => {
    await driveLocalDB.resetDatabase();
    await fileSystemService.unlinkIfExists(DRIVE_ROOT_DIRECTORY);
    driveLogger.info('Drive system clear');
  },
  start: async () => {
    driveLogger.info('Drive system start');
    await fileSystemService.mkdir(DRIVE_ROOT_DIRECTORY);
    await fileSystemService.mkdir(DRIVE_THUMBNAILS_DIRECTORY);
    await fileSystemService.mkdir(DRIVE_CACHE_DIRECTORY);
    await driveFileCache.init();
  },
};
