import { logger } from '@internxt-mobile/services/common';
import { AbortError } from '../../network/errors';
import { getErrorStatus } from './httpErrorStatus';

type RetryWithBackoffOptions = {
  delaysMs: readonly number[];
  shouldRetry: (error: unknown) => boolean;
  jitterRatio?: number;
  context: string;
  signal?: AbortSignal;
};

const waitUnlessAborted = (delayMs: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new AbortError());
      return;
    }
    const onAbort = () => {
      clearTimeout(timeoutId);
      reject(new AbortError());
    };
    const timeoutId = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, delayMs);
    signal?.addEventListener('abort', onAbort, { once: true });
  });

/**
 * Runs `operation`, and while it throws an error accepted by `shouldRetry`, waits the next delay of `delaysMs`
 * and runs it again. Rethrows any other error, or the last one once the delays run out.
 * With `jitterRatio`, each wait is lengthened by a random amount up to that fraction of its delay.
 * Throws `AbortError` as soon as `signal` aborts during a wait.
 */
export const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  { delaysMs, shouldRetry, jitterRatio = 0, context, signal }: RetryWithBackoffOptions,
): Promise<T> => {
  for (let attemptIndex = 0; ; attemptIndex++) {
    try {
      return await operation();
    } catch (error) {
      const plannedDelayMs = delaysMs[attemptIndex];
      if (plannedDelayMs === undefined || !shouldRetry(error)) {
        throw error;
      }
      const delayMs = Math.round(plannedDelayMs * (1 + Math.random() * jitterRatio));
      logger.warn(`${context} failed (${getErrorStatus(error)}), retrying in ${delayMs}ms`);
      await waitUnlessAborted(delayMs, signal);
    }
  }
};
