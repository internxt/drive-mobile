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
  ) {
    super(`File already exists in Drive: ${fileName}`);
    this.name = 'FileAlreadyExistsError';
  }
}
