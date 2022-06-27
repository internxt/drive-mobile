import RNFS from 'react-native-fs';

export const PHOTOS_ROOT_DIRECTORY = `${RNFS.DocumentDirectoryPath}/photos`;
export const PHOTOS_DIRECTORY = `${PHOTOS_ROOT_DIRECTORY}/photos`;
export const PHOTOS_PREVIEWS_DIRECTORY = `${PHOTOS_ROOT_DIRECTORY}/previews`;
export const PHOTOS_TMP_DIRECTORY = `${PHOTOS_ROOT_DIRECTORY}/tmp`;

export const PHOTOS_PER_GROUP = 50;
export const PHOTOS_PER_NETWORK_GROUP = 1;
