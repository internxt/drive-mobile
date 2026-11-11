export class SavePermissionDeniedError extends Error {
  constructor() {
    super('Media library permission not granted');
    this.name = 'SavePermissionDeniedError';
  }
}

export class FileAlreadyExistsError extends Error {
  constructor(
    fileName: string,
    public readonly existingUuid: string,
    public readonly folderUuid?: string,
  ) {
    super(`File already exists in Drive: ${fileName}`);
    this.name = 'FileAlreadyExistsError';
  }
}

/** A failed upload to the bucket, with the HTTP status of the original error when it had one. */
export class BucketUploadError extends Error {
  constructor(
    fileName: string,
    reason: string,
    public readonly status?: number,
  ) {
    super(`Bucket upload failed for ${fileName}: ${reason}`);
    this.name = 'BucketUploadError';
  }
}

export class PhotoDeviceNameConflictError extends Error {
  constructor(deviceName: string) {
    super(`A photos device folder with name "${deviceName}" already exists`);
    this.name = 'PhotoDeviceNameConflictError';
  }
}
