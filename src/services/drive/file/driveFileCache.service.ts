import { FileCacheManager, FileCacheManagerConfig } from '@internxt-mobile/services/common/filesystem/fileCacheManager';
import { DRIVE_CACHE_DIRECTORY, MAX_CACHE_DIRECTORY_SIZE_IN_BYTES, MAX_FILE_SIZE_FOR_CACHING } from '../constants';

export class DriveFileCache extends FileCacheManager {
  constructor(config: FileCacheManagerConfig) {
    super(config);
  }
}

export const driveFileCache = new DriveFileCache({
  directory: DRIVE_CACHE_DIRECTORY,
  maxFileSizeToCacheInBytes: MAX_FILE_SIZE_FOR_CACHING,
  maxSpaceInBytes: MAX_CACHE_DIRECTORY_SIZE_IN_BYTES,
});
