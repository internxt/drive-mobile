import { getErrorStatus, isServerError } from './httpErrorStatus';

describe('getErrorStatus', () => {
  test('when the error has a status, then it returns it', () => {
    expect(getErrorStatus({ status: 404 })).toBe(404);
  });

  test('when the error only has a status code, then it returns it', () => {
    expect(getErrorStatus({ statusCode: 409 })).toBe(409);
  });

  test('when the error has no status, then it returns nothing', () => {
    expect(getErrorStatus(new Error('Something failed'))).toBeUndefined();
    expect(getErrorStatus(undefined)).toBeUndefined();
  });
});

describe('isServerError', () => {
  test('when the server answers with a 5xx error, then it is a server error', () => {
    expect(isServerError({ status: 500 })).toBe(true);
    expect(isServerError({ status: 502 })).toBe(true);
  });

  test('when the request is rejected with a 4xx error, then it is not a server error', () => {
    expect(isServerError({ status: 400 })).toBe(false);
    expect(isServerError({ status: 409 })).toBe(false);
  });

  test('when the error has no status, then it is not a server error', () => {
    expect(isServerError(new Error('Something failed'))).toBe(false);
  });
});
