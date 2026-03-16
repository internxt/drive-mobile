export class FileTooLargeError extends Error {
  constructor() {
    super('Total file size exceeds the iOS share extension upload limit');
    this.name = 'FileTooLargeError';
    Object.setPrototypeOf(this, FileTooLargeError.prototype);
  }
}

export class MissingFileUriError extends Error {
  constructor() {
    super('Shared file is missing a URI — cannot upload');
    this.name = 'MissingFileUriError';
    Object.setPrototypeOf(this, MissingFileUriError.prototype);
  }
}

export class UploadNetworkError extends Error {
  readonly cause: unknown;

  constructor(cause: unknown) {
    super('Upload failed due to a network connectivity issue');
    this.name = 'UploadNetworkError';
    this.cause = cause;
    Object.setPrototypeOf(this, UploadNetworkError.prototype);
  }
}
