import fileSystemService from '../FileSystemService';

export const PHOTOS_ROOT_DIRECTORY = `${fileSystemService.getDocumentsDir()}/photos`;
export const PHOTOS_DIRECTORY = `${PHOTOS_ROOT_DIRECTORY}/photos`;
export const PHOTOS_PREVIEWS_DIRECTORY = `${PHOTOS_ROOT_DIRECTORY}/previews`;
export const PHOTOS_TMP_DIRECTORY = `${PHOTOS_ROOT_DIRECTORY}/tmp`;
