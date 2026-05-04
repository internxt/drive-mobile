export class EmptyFileNotAllowedError extends Error {
  constructor() {
    super('Empty files require a paid plan');
    this.name = 'EmptyFileNotAllowedError';
    Object.setPrototypeOf(this, EmptyFileNotAllowedError.prototype);
  }
}

export const isEmptyFilePlanError = (error: unknown): boolean => {
  const err = error as { status?: unknown; response?: { status?: unknown } };
  const status = Number(err?.status ?? err?.response?.status);
  return status === 402;
};
