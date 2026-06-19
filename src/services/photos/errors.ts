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

export class PhotoDeviceNameConflictError extends Error {
  constructor(deviceName: string) {
    super(`A photos device folder with name "${deviceName}" already exists`);
    this.name = 'PhotoDeviceNameConflictError';
  }
}
