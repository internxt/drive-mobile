export class FileSizeExceededError extends Error {
  constructor() {
    super('File size exceeds the maximum allowed by your plan');
    this.name = 'FileSizeExceededError';
    Object.setPrototypeOf(this, FileSizeExceededError.prototype);
  }
}

export const isFileSizeExceededError = (error: unknown): boolean => {
  const e = error as { response?: { data?: { error?: string } }; data?: { error?: string } };
  return e?.response?.data?.error === 'FILE_UPLOAD_SIZE_EXCEEDED' || e?.data?.error === 'FILE_UPLOAD_SIZE_EXCEEDED';
};
