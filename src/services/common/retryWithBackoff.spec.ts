import { AbortError } from '../../network/errors';
import { retryWithBackoff } from './retryWithBackoff';

jest.mock('@internxt-mobile/services/common', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const DELAYS_MS = [500, 1000, 2000];
const RETRYABLE_ERROR = { status: 502 };
const FINAL_ERROR = { status: 400 };
const JITTER_RATIO = 0.5;
const MOCKED_RANDOM_VALUE = 0.9;

const isRetryableError = (error: unknown) => error === RETRYABLE_ERROR;

describe('retryWithBackoff', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const runWhileAdvancingTimers = async <T>(pendingOperation: Promise<T>): Promise<T> => {
    const settledOperation = pendingOperation.then(
      (value) => ({ value, error: undefined }),
      (error: unknown) => ({ value: undefined, error }),
    );
    await jest.runAllTimersAsync();
    const { value, error } = await settledOperation;
    if (error !== undefined) {
      throw error;
    }
    return value as T;
  };

  test('when the operation succeeds at the first attempt, then it returns its value without retrying', async () => {
    const operation = jest.fn().mockResolvedValue('created');

    const value = await runWhileAdvancingTimers(
      retryWithBackoff(operation, { delaysMs: DELAYS_MS, shouldRetry: isRetryableError, context: 'Test' }),
    );

    expect(value).toBe('created');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  test('when the operation fails with a retryable error and then succeeds, then it returns the value of the later attempt', async () => {
    const operation = jest.fn().mockRejectedValueOnce(RETRYABLE_ERROR).mockResolvedValue('created');

    const value = await runWhileAdvancingTimers(
      retryWithBackoff(operation, { delaysMs: DELAYS_MS, shouldRetry: isRetryableError, context: 'Test' }),
    );

    expect(value).toBe('created');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  test('when the operation fails with an error that should not be retried, then it throws that error at once', async () => {
    const operation = jest.fn().mockRejectedValue(FINAL_ERROR);

    await expect(
      runWhileAdvancingTimers(
        retryWithBackoff(operation, { delaysMs: DELAYS_MS, shouldRetry: isRetryableError, context: 'Test' }),
      ),
    ).rejects.toBe(FINAL_ERROR);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  test('when the operation keeps failing with a retryable error, then it throws the error after one attempt per delay plus the first one', async () => {
    const operation = jest.fn().mockRejectedValue(RETRYABLE_ERROR);

    await expect(
      runWhileAdvancingTimers(
        retryWithBackoff(operation, { delaysMs: DELAYS_MS, shouldRetry: isRetryableError, context: 'Test' }),
      ),
    ).rejects.toBe(RETRYABLE_ERROR);
    expect(operation).toHaveBeenCalledTimes(DELAYS_MS.length + 1);
  });

  test('when the waits have a random part, then the retry happens after the planned wait lengthened by that random part', async () => {
    const firstDelayMs = DELAYS_MS[0];
    const jitteredFirstWaitMs = firstDelayMs * (1 + MOCKED_RANDOM_VALUE * JITTER_RATIO);
    jest.spyOn(Math, 'random').mockReturnValue(MOCKED_RANDOM_VALUE);
    const operation = jest.fn().mockRejectedValueOnce(RETRYABLE_ERROR).mockResolvedValue('created');

    const pendingOperation = retryWithBackoff(operation, {
      delaysMs: DELAYS_MS,
      shouldRetry: isRetryableError,
      jitterRatio: JITTER_RATIO,
      context: 'Test',
    });
    await jest.advanceTimersByTimeAsync(jitteredFirstWaitMs - 1);
    expect(operation).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(1);
    expect(operation).toHaveBeenCalledTimes(2);
    await expect(pendingOperation).resolves.toBe('created');
  });

  test('when the waits have no random part, then the retry happens exactly after the planned wait', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(MOCKED_RANDOM_VALUE);
    const operation = jest.fn().mockRejectedValueOnce(RETRYABLE_ERROR).mockResolvedValue('created');

    const pendingOperation = retryWithBackoff(operation, {
      delaysMs: DELAYS_MS,
      shouldRetry: isRetryableError,
      context: 'Test',
    });
    await jest.advanceTimersByTimeAsync(DELAYS_MS[0] - 1);
    expect(operation).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(1);
    expect(operation).toHaveBeenCalledTimes(2);
    await expect(pendingOperation).resolves.toBe('created');
  });

  test('when the operation is cancelled while waiting to retry, then it stops at once without trying again', async () => {
    const abortController = new AbortController();
    const operation = jest.fn().mockRejectedValue(RETRYABLE_ERROR);

    const pendingOperation = retryWithBackoff(operation, {
      delaysMs: DELAYS_MS,
      shouldRetry: isRetryableError,
      context: 'Test',
      signal: abortController.signal,
    });
    await jest.advanceTimersByTimeAsync(0);
    abortController.abort();

    await expect(pendingOperation).rejects.toBeInstanceOf(AbortError);
    expect(operation).toHaveBeenCalledTimes(1);
  });
});
