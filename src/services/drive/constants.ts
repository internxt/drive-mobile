import * as RNFS from '@dr.pogodin/react-native-fs';

export const DRIVE_ROOT_DIRECTORY = `${RNFS.DocumentDirectoryPath}/drive`;
export const DRIVE_THUMBNAILS_DIRECTORY = `${DRIVE_ROOT_DIRECTORY}/thumbnails`;
export const DRIVE_CACHE_DIRECTORY = `${DRIVE_ROOT_DIRECTORY}/cache`;
export const MAX_CACHE_DIRECTORY_SIZE_IN_BYTES = 1024 * 1024 * 500;

// 10% of the directory size
export const MAX_FILE_SIZE_FOR_CACHING = MAX_CACHE_DIRECTORY_SIZE_IN_BYTES * 0.1;
