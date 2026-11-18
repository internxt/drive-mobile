export class AbortError extends Error {
  static readonly errorName = 'AbortError';

  constructor(message = 'Upload cancelled') {
    super(message);
    this.name = AbortError.errorName;
  }
}

export class ChunkDownloadHttpError extends Error {
  constructor(public readonly status: number) {
    super(`Chunk download failed with HTTP status ${status}`);
    this.name = 'ChunkDownloadHttpError';
  }
}

export class ChunkDownloadIncompleteError extends Error {
  constructor(expectedByteCount: number, writtenByteCount: number) {
    super(`Chunk download wrote ${writtenByteCount} bytes instead of ${expectedByteCount}`);
    this.name = 'ChunkDownloadIncompleteError';
  }
}

export class ChunkDownloadInterruptedError extends Error {
  constructor() {
    super('Chunk download was interrupted');
    this.name = 'ChunkDownloadInterruptedError';
  }
}
