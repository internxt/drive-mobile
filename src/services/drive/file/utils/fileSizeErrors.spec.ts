import { FileSizeExceededError, isFileSizeExceededError } from './fileSizeErrors';

describe('FileSizeExceededError', () => {
  test('when constructed, then it has the expected name and message', () => {
    const err = new FileSizeExceededError();
    expect(err).toBeInstanceOf(FileSizeExceededError);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('FileSizeExceededError');
    expect(err.message).toBe('File size exceeds the maximum allowed by your plan');
  });
});

describe('isFileSizeExceededError', () => {
  test('when error has response.data.error = FILE_UPLOAD_SIZE_EXCEEDED, then it returns true', () => {
    expect(isFileSizeExceededError({ response: { data: { error: 'FILE_UPLOAD_SIZE_EXCEEDED' } } })).toBe(true);
  });

  test('when error has bare data.error = FILE_UPLOAD_SIZE_EXCEEDED, then it returns true', () => {
    expect(isFileSizeExceededError({ data: { error: 'FILE_UPLOAD_SIZE_EXCEEDED' } })).toBe(true);
  });

  test('when error has a different error code, then it returns false', () => {
    expect(isFileSizeExceededError({ response: { data: { error: 'SOMETHING_ELSE' } } })).toBe(false);
  });

  test('when error is null or undefined, then it returns false', () => {
    expect(isFileSizeExceededError(null)).toBe(false);
    expect(isFileSizeExceededError(undefined)).toBe(false);
  });

  test('when error has no response/data field, then it returns false', () => {
    expect(isFileSizeExceededError(new Error('boom'))).toBe(false);
  });
});
