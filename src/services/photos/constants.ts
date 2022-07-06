import RNFS from 'react-native-fs';

export const PHOTOS_ROOT_DIRECTORY = `${RNFS.DocumentDirectoryPath}/photos`;
export const PHOTOS_DIRECTORY = `${PHOTOS_ROOT_DIRECTORY}/photos`;
export const PHOTOS_PREVIEWS_DIRECTORY = `${PHOTOS_ROOT_DIRECTORY}/previews`;
export const PHOTOS_TMP_DIRECTORY = `${PHOTOS_ROOT_DIRECTORY}/tmp`;

export const PHOTOS_PER_GROUP = 50;
export const PHOTOS_PER_NETWORK_GROUP = 15;

// Controls how many simultaneous operations runs in the photos network manager
export const PHOTOS_NETWORK_MANAGER_QUEUE_CONCURRENCY = 2;

// Controls how many simultaneous operations runs in the photos sync checker
export const PHOTOS_SYNC_CHECKER_QUEUE_CONCURRENCY = 2;
