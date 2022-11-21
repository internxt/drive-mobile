import RNFS from 'react-native-fs';

export const PHOTOS_ROOT_DIRECTORY = `${RNFS.DocumentDirectoryPath}/photos`;
export const PHOTOS_FULL_SIZE_DIRECTORY = `${PHOTOS_ROOT_DIRECTORY}/full`;
export const PHOTOS_PREVIEWS_DIRECTORY = `${PHOTOS_ROOT_DIRECTORY}/previews`;

export const REMOTE_PHOTOS_PER_PAGE = 20;
export const PHOTOS_PER_GROUP = 50;

// Controls how many simultaneous operations runs in the photos network manager
export const PHOTOS_NETWORK_MANAGER_QUEUE_CONCURRENCY = 1;

// Controls how many simultaneous operations runs in the photos sync checker
export const PHOTOS_SYNC_CHECKER_QUEUE_CONCURRENCY = 2;

export const PHOTOS_ITEMS_PER_PAGE = 24;

// Enables the photos sync system
export const ENABLE_PHOTOS_SYNC = true;

// Enable the photos analytics reporting, such screen, track and identifying
export const ENABLE_PHOTOS_ANALYTICS = true;

// Saves the last photos page pulled remotely, helpful to pull all the previews from page 1
export const SAVE_LAST_PHOTOS_PAGE_PULLED = true;

// Logging, this logs will be turned off in production mode
export const ENABLE_PHOTOS_SYNC_MANAGER_LOGS = false;
export const ENABLE_PHOTOS_ANALYTICS_LOGS = false;
export const ENABLE_PHOTOS_NETWORK_MANAGER_LOGS = false;

// How many times a photo can be retried if the upload fails
export const MAX_UPLOAD_RETRIES = 2;
