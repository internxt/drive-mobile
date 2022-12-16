// Set the prototype correctly in each error as stated here
// https://www.dannyguo.com/blog/how-to-fix-instanceof-not-working-for-custom-errors-in-typescript/
export class FileDoesntExistsError extends Error {
  constructor(message: string) {
    super(message);

    Object.setPrototypeOf(this, FileDoesntExistsError.prototype);
  }
}

export class FileCacheManagerConfigError extends Error {
  constructor(message: string) {
    super(message);

    Object.setPrototypeOf(this, FileCacheManagerConfigError.prototype);
  }
}

export class UnlinkOperationError extends Error {
  constructor(message: string) {
    super(message);

    Object.setPrototypeOf(this, UnlinkOperationError.prototype);
  }
}

export class ExceedMaxDirSizeError extends Error {
  constructor(message: string) {
    super(message);

    Object.setPrototypeOf(this, ExceedMaxDirSizeError.prototype);
  }
}
