import { logger } from '@internxt-mobile/services/common';
import { HTTP_TOO_MANY_REQUESTS, MAX_RATE_LIMIT_RETRIES, rateLimitService } from './rate-limit.service';

/**
 * Wraps an async operation with rate-limit-aware retry logic.
 * On 429, waits using rateLimitService delay and retries without consuming caller retries.
 * Returns the result or throws the original error if retries are exhausted.
 */
export const withRateLimitRetry = async <T>(
  operation: () => Promise<T>,
  context: string,
  endpointKey?: string,
): Promise<T> => {
  let rateLimitRetries = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await operation();
    } catch (err) {
      const errorStatus = (err as { status?: number }).status;
      const isRateLimited = errorStatus === HTTP_TOO_MANY_REQUESTS;
      const canRetry = isRateLimited && rateLimitRetries < MAX_RATE_LIMIT_RETRIES;

      if (!canRetry) throw err;

      rateLimitRetries++;
      const delay = rateLimitService.getRetryDelay(undefined, endpointKey);
      logger.warn(`[RateLimit] ${context} 429, retry ${rateLimitRetries}/${MAX_RATE_LIMIT_RETRIES} after ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};
