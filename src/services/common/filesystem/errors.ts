export class FileDoesntExistsError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class FileCacheManagerConfigError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class UnlinkOperationError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class ExceedMaxDirSizeError extends Error {
  constructor(message: string) {
    super(message);
  }
}
