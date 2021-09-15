export const DEFAULT_INXT_MIRRORS = 10;

/* EVENTS */
export const DOWNLOAD_CANCELLED = 'DOWNLOAD CANCELLED';
export const UPLOAD_CANCELLED = 'UPLOAD CANCELLED';

/* ERRORS */
export const ENCRYPTION_KEY_NOT_PROVIDED = 'Encryption key was not provided';
export const BUCKET_ID_NOT_PROVIDED = 'Bucket id was not provided';
export const FILE_ID_NOT_PROVIDED = 'File id was not provided';
export const DOWNLOAD_CANCELLED_ERROR = 'Process killed by user';

export const MIN_SHARD_SIZE = 2097152;
export const MAX_SHARD_SIZE = 4294967296;
export const SHARD_MULTIPLE_BACK = 4;