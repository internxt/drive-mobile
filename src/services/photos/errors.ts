export class FileAlreadyExistsError extends Error {
  constructor(
    fileName: string,
    public readonly existingUuid: string,
  ) {
    super(`File already exists in Drive: ${fileName}`);
    this.name = 'FileAlreadyExistsError';
  }
}
