import fs from '@internxt-mobile/services/FileSystemService';
import prettysize from 'prettysize';
import { BaseLogger } from '../logger';

export type FileCacheManagerConfig = {
  directory: string;
  maxSpaceInBytes: number;
  maxFileSizeToCacheInBytes: number;
};

export type CacheFileOperationResult = {
  cached: boolean;
  directorySize: number;
  cachedAtPath?: string;
  reason?: string;
};
/**
 * Allows to maintain a cached set of files in
 * a given directory. Is recommended to work
 * with smaller files
 */
export class FileCacheManager {
  private logger = new BaseLogger({
    tag: 'FILE_CACHE_MANAGER',
    enabled: __DEV__,
  });
  private initialized = false;
  private directorySize: number;
  constructor(private config: FileCacheManagerConfig) {
    this.directorySize = 0;
  }

  async init() {
    this.initialized = true;
    await this.prepareDirectory();
    this.logger.info(`File cache manager started at ${this.config.directory}`);
  }

  async cacheFile(filePath: string, cachedFileName: string): Promise<CacheFileOperationResult> {
    await this.smokeTestDirectory();
    // 1. Ensure the file exists
    const exists = await fs.exists(filePath);

    if (!exists) throw new Error(`${filePath} does not exists`);

    // 2. Get the file stats
    const fileStat = await fs.statRNFS(filePath);
    const sizeInBytes = fileStat.size;

    // 3. Do not cache if the file is bigger than the maxFileSizeToCacheInBytes option
    if (sizeInBytes > this.config.maxFileSizeToCacheInBytes) {
      this.logger.warn('Cannot cache file since is bigger than the max size allowed');
      return {
        cached: false,
        directorySize: this.directorySize,
        reason: `Max file size to be cached is set to ${this.config.maxFileSizeToCacheInBytes}, this file size is ${sizeInBytes}`,
      };
    }

    const exceedsMaxDirSize = this.directorySize + sizeInBytes > this.config.maxSpaceInBytes;

    const cachedFilePath = await this.getCachedFilePath(cachedFileName);

    const cachedFileAlreadyExists = await fs.exists(cachedFilePath);
    // If the file already exists, just touch it
    if (cachedFileAlreadyExists) {
      this.logger.info('Cached file already exists, touching mtime');
      await fs.touch(cachedFilePath, new Date());
      await this.setDirSize(this.config.directory);
      return {
        cached: true,
        cachedAtPath: cachedFilePath,
        directorySize: this.directorySize,
      };
    }
    const oldDirSize = this.directorySize;
    // The file can fit into the directory
    if (!exceedsMaxDirSize) {
      this.logger.info('Caching file...');

      await fs.moveFile(filePath, cachedFilePath);

      await this.setDirSize(this.config.directory);
      this.logger.info(`File cached, dir size from ${prettysize(oldDirSize)} to ${prettysize(this.directorySize)}`);
      return {
        cached: true,
        cachedAtPath: cachedFilePath,
        directorySize: this.directorySize,
      };
    }

    this.logger.info('Not enough space in directory, freeing space');
    // The file can NOT fit into the directory, remove files until it fits
    await this.removeFilesUntilEnoughSpace(sizeInBytes);

    await fs.moveFile(filePath, cachedFilePath);
    await this.setDirSize(this.config.directory);
    this.logger.info(`File cached, dir size from ${prettysize(oldDirSize)} to ${prettysize(this.directorySize)}`);
    return {
      cached: true,
      cachedAtPath: cachedFilePath,
      directorySize: this.directorySize,
    };
  }

  async destroy() {
    await this.smokeTestDirectory();
    const assets = await fs.readDir(this.config.directory);

    for (const asset of assets) {
      await fs.unlinkIfExists(asset.path);
    }

    fs.unlinkIfExists(this.config.directory);
  }

  async getCachedFilePath(cachedFileName: string) {
    await this.smokeTestDirectory();

    return this.config.directory + '/' + cachedFileName;
  }

  async removeCachedFile(cachedFileName: string) {
    await this.smokeTestDirectory();
    const cachedFilePath = await this.getCachedFilePath(cachedFileName);
    const removed = await fs.unlinkIfExists(cachedFilePath);

    await this.setDirSize(this.config.directory);
    this.logger.info(`${cachedFileName} file removed from cache`);
    return removed;
  }

  async isCached(cachedFileName: string) {
    const path = await this.getCachedFilePath(cachedFileName);
    const isCached = await fs.exists(path);
    return {
      isCached,
      path,
    };
  }

  /**
   * Ensure that some assumptions are really true
   */
  private async smokeTestDirectory() {
    // 1. Ensure file cache manager is initialized
    if (!this.initialized) throw new Error('FileCacheManager not initialized, call init() method to start it');

    // 2. Ensure we have a directory in the config
    if (!this.config.directory) throw new Error('Directory not provided, can not start file cache manager');

    // 3. Ensure the directory exists
    const exists = await fs.exists(this.config.directory);

    if (!exists) throw new Error('Provided directory does not exists');

    // All good, continue
  }

  private async removeFilesUntilEnoughSpace(neededSpaceInBytes: number) {
    const spaceToFree = this.directorySize + neededSpaceInBytes - this.config.maxSpaceInBytes;

    let freedSpace = 0;
    // No need to free space in the directory
    if (spaceToFree < 0) return;

    const filesByOldest = await this.getSortedByOldest();
    let keepRemoving = true;
    // Remove files until freedSpace >= spaceToFree
    for (const fileByOldest of filesByOldest) {
      if (keepRemoving) {
        const size = fileByOldest.size;

        const removed = fs.unlinkIfExists(fileByOldest.path);

        if (!removed) throw new Error('Cannot remove file');

        freedSpace += size;

        if (freedSpace >= spaceToFree) {
          keepRemoving = false;
        }
      }
    }

    await this.setDirSize(this.config.directory);

    // Ensure file can fit, or throw an error
    if (this.directorySize + neededSpaceInBytes > this.config.maxSpaceInBytes)
      throw new Error('Not enough space freed, the file cannot be cached');

    this.logger.info(`Freed ${prettysize(freedSpace)} from the cache directory`);
  }

  private async getSortedByOldest() {
    // Ensure things before operate
    await this.smokeTestDirectory();
    const dirAssets = await fs.readDir(this.config.directory);

    const sorted = dirAssets.sort((asset1, asset2) => {
      if (!asset1.mtime) return -1;
      if (!asset2.mtime) return -1;
      if (asset1.mtime.getTime() > asset2.mtime.getTime()) return 1;
      return -1;
    });

    return sorted;
  }

  private async prepareDirectory() {
    await this.smokeTestDirectory();
    await this.setDirSize(this.config.directory);
  }

  // Reads the dir and sets the current size
  private async setDirSize(directory: string) {
    this.directorySize = await fs.getDirSize(directory);
  }
}
