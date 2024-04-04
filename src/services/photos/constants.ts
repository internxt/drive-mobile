import RNFS from 'react-native-fs';

export const PHOTOS_ROOT_DIRECTORY = `${RNFS.DocumentDirectoryPath}/photos`;
export const PHOTOS_FULL_SIZE_DIRECTORY = `${PHOTOS_ROOT_DIRECTORY}/full`;
export const PHOTOS_PREVIEWS_DIRECTORY = `${PHOTOS_ROOT_DIRECTORY}/previews`;

export const REMOTE_PHOTOS_PER_PAGE = 200;
export const PHOTOS_PER_GROUP = 50;

// Controls how many simultaneous operations runs in the photos network manager
export const PHOTOS_NETWORK_MANAGER_QUEUE_CONCURRENCY = 1;

// Controls how many simultaneous operations runs in the photos sync checker
export const PHOTOS_SYNC_CHECKER_QUEUE_CONCURRENCY = 2;

// Enables the photos sync system
export const ENABLE_PHOTOS_SYNC = false;

// Enable the photos analytics reporting, such screen, track and identifying
export const ENABLE_PHOTOS_ANALYTICS = true;

// Saves the last photos page pulled remotely, helpful to pull all the previews from page 1
export const SAVE_LAST_PHOTOS_PAGE_PULLED = true;

// How many times a photo can be retried if the upload fails
export const MAX_UPLOAD_RETRIES = 2;

// How many times a photo preview can be retried if the download fails
export const MAX_PREVIEW_DOWNLOAD_RETRIES = 3;

// Hide the photos previews
export const PRIVATE_MODE_ENABLED = false;

// % of Photos that we need to pull to start the local sync
// For example, if we have 1000 photos remotely, and the treshold is
// set to 0.5, the local sync will start once we have 500 photos pulled
export const REMOTE_PHOTOS_PULLED_TRESHOLD = 0.35;
