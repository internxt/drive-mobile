import { withRateLimitRetry } from './rate-limit.retry';
import { HTTP_TOO_MANY_REQUESTS, MAX_RATE_LIMIT_RETRIES, rateLimitService } from './rate-limit.service';

jest.mock('@internxt-mobile/services/common', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const { logger } = jest.requireMock('@internxt-mobile/services/common');

const make429Error = (status = HTTP_TOO_MANY_REQUESTS) => ({ status, message: 'Too Many Requests' });

describe('withRateLimitRetry', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(rateLimitService, 'getRetryDelay').mockReturnValue(1000);
    (logger.warn as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('when operation succeeds on first try, then returns the result without retrying', async () => {
    const operation = jest.fn().mockResolvedValue('ok');

    const promise = withRateLimitRetry(operation, 'test-context');
    await jest.advanceTimersByTimeAsync(0);
    const result = await promise;

    expect(result).toBe('ok');
    expect(operation).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('when operation fails with 429 then succeeds, then retries and returns the result', async () => {
    const operation = jest.fn().mockRejectedValueOnce(make429Error()).mockResolvedValue('recovered');

    const promise = withRateLimitRetry(operation, 'upload');
    await jest.advanceTimersByTimeAsync(1000);
    const result = await promise;

    expect(result).toBe('recovered');
    expect(operation).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('when operation fails with non-429 error, then throws immediately without retrying', async () => {
    const nonRateLimitError = { status: 500, message: 'Server Error' };
    const operation = jest.fn().mockRejectedValue(nonRateLimitError);

    const promise = withRateLimitRetry(operation, 'test-context');
    await expect(promise).rejects.toEqual(nonRateLimitError);
    expect(operation).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('when operation fails with error without status, then throws immediately', async () => {
    const plainError = new Error('network failure');
    const operation = jest.fn().mockRejectedValue(plainError);

    const promise = withRateLimitRetry(operation, 'test-context');
    await expect(promise).rejects.toThrow('network failure');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it(`when operation fails with 429 ${MAX_RATE_LIMIT_RETRIES} times, then exhausts retries and throws`, async () => {
    const error429 = make429Error();
    const operation = jest.fn().mockRejectedValue(error429);

    let caughtError: unknown;
    const promise = withRateLimitRetry(operation, 'upload').catch((err) => {
      caughtError = err;
    });

    for (let i = 0; i < MAX_RATE_LIMIT_RETRIES; i++) {
      await jest.advanceTimersByTimeAsync(1000);
    }

    await promise;
    expect(caughtError).toEqual(error429);
    expect(operation).toHaveBeenCalledTimes(MAX_RATE_LIMIT_RETRIES + 1);
    expect(logger.warn).toHaveBeenCalledTimes(MAX_RATE_LIMIT_RETRIES);
  });

  it('when operation fails with 429 twice then succeeds, then returns the result', async () => {
    const operation = jest
      .fn()
      .mockRejectedValueOnce(make429Error())
      .mockRejectedValueOnce(make429Error())
      .mockResolvedValue('third-time-charm');

    const promise = withRateLimitRetry(operation, 'upload');
    await jest.advanceTimersByTimeAsync(1000);
    await jest.advanceTimersByTimeAsync(1000);
    const result = await promise;

    expect(result).toBe('third-time-charm');
    expect(operation).toHaveBeenCalledTimes(3);
    expect(logger.warn).toHaveBeenCalledTimes(2);
  });

  it('when endpointKey is provided, then passes it to getRetryDelay', async () => {
    const operation = jest.fn().mockRejectedValueOnce(make429Error()).mockResolvedValue('ok');

    const promise = withRateLimitRetry(operation, 'upload', 'https://gw.internxt.com/drive/files');
    await jest.advanceTimersByTimeAsync(1000);
    await promise;

    expect(rateLimitService.getRetryDelay).toHaveBeenCalledWith(undefined, 'https://gw.internxt.com/drive/files');
  });

  it('when endpointKey is not provided, then passes undefined to getRetryDelay', async () => {
    const operation = jest.fn().mockRejectedValueOnce(make429Error()).mockResolvedValue('ok');

    const promise = withRateLimitRetry(operation, 'upload');
    await jest.advanceTimersByTimeAsync(1000);
    await promise;

    expect(rateLimitService.getRetryDelay).toHaveBeenCalledWith(undefined, undefined);
  });

  it('when retrying, then logs the correct context and retry count', async () => {
    const operation = jest
      .fn()
      .mockRejectedValueOnce(make429Error())
      .mockRejectedValueOnce(make429Error())
      .mockResolvedValue('ok');

    const promise = withRateLimitRetry(operation, 'file-upload');
    await jest.advanceTimersByTimeAsync(1000);
    await jest.advanceTimersByTimeAsync(1000);
    await promise;

    expect(logger.warn).toHaveBeenCalledWith(
      `[RateLimit] file-upload 429, retry 1/${MAX_RATE_LIMIT_RETRIES} after 1000ms`,
    );
    expect(logger.warn).toHaveBeenCalledWith(
      `[RateLimit] file-upload 429, retry 2/${MAX_RATE_LIMIT_RETRIES} after 1000ms`,
    );
  });

  it('when getRetryDelay returns different values per call, then uses the correct delay each time', async () => {
    (rateLimitService.getRetryDelay as jest.Mock).mockReturnValueOnce(500).mockReturnValueOnce(2000);
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

    const operation = jest
      .fn()
      .mockRejectedValueOnce(make429Error())
      .mockRejectedValueOnce(make429Error())
      .mockResolvedValue('ok');

    const promise = withRateLimitRetry(operation, 'upload');
    await jest.advanceTimersByTimeAsync(500);
    await jest.advanceTimersByTimeAsync(2000);
    await promise;

    const delayCalls = setTimeoutSpy.mock.calls
      .filter((args) => typeof args[1] === 'number' && args[1] > 0)
      .map((args) => args[1]);
    expect(delayCalls).toEqual([500, 2000]);
  });

  it('when operation returns a typed result, then preserves the type', async () => {
    const operation = jest.fn().mockResolvedValue({ id: 1, name: 'test' });

    const promise = withRateLimitRetry(operation, 'typed');
    await jest.advanceTimersByTimeAsync(0);
    const result = await promise;

    expect(result).toEqual({ id: 1, name: 'test' });
  });
});
