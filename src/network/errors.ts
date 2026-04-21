export class AbortError extends Error {
  static readonly errorName = 'AbortError';

  constructor(message = 'Upload cancelled') {
    super(message);
    this.name = AbortError.errorName;
  }
}
