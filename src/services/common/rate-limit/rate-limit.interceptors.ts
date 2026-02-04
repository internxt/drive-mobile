import { logger } from '@internxt-mobile/services/common';
import axios, { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import {
  HEADER_RATELIMIT_LIMIT,
  HEADER_RATELIMIT_REMAINING,
  HEADER_RATELIMIT_RESET,
  HEADER_RETRY_AFTER,
  HTTP_TOO_MANY_REQUESTS,
  MAX_RATE_LIMIT_RETRIES,
  extractEndpointKey,
  rateLimitService,
} from './rate-limit.service';

interface AxiosErrorLike {
  response?: { status?: number; headers?: Record<string, string> };
  config?: InternalAxiosRequestConfig & { __rateLimitRetry?: number };
}

/**
 * Interceptors to pass to SDK's HttpClient.
 * They run BEFORE extractData/normalizeError so they see full response headers.
 *
 * - Request: proactive throttle when remaining quota is low
 * - Response success: track rate limit state from headers
 * - Response error: on 429, wait and retry transparently using raw axios
 *   (raw axios avoids the double-processing issue with extractData)
 */
export const rateLimitInterceptors = [
  {
    request: {
      onFulfilled: async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
        const endpointKey = extractEndpointKey(config);
        await rateLimitService.waitIfNeeded(endpointKey);
        return config;
      },
    },
    response: {
      onFulfilled: (response: AxiosResponse): AxiosResponse => {
        if (response.headers) {
          const endpointKey = extractEndpointKey(response.config);
          logResponseHeaders(response);
          rateLimitService.updateFromHeaders(response.headers as Record<string, string>, endpointKey);
        }
        return response;
      },
      onRejected: async (error: unknown): Promise<AxiosResponse> => {
        const axiosError = error as AxiosErrorLike;
        const endpointKey = axiosError.config ? extractEndpointKey(axiosError.config) : 'unknown';

        if (axiosError.response?.headers) {
          logErrorHeaders(axiosError);
          rateLimitService.updateFromHeaders(axiosError.response.headers, endpointKey);
        }

        if (axiosError.response?.status === HTTP_TOO_MANY_REQUESTS && axiosError.config) {
          const attempt = (axiosError.config.__rateLimitRetry ?? 0) + 1;

          if (attempt <= MAX_RATE_LIMIT_RETRIES) {
            const retryAfter = axiosError.response.headers?.[HEADER_RETRY_AFTER];
            const delay = rateLimitService.getRetryDelay(retryAfter, endpointKey);
            logRetry(attempt, delay);

            await new Promise((resolve) => setTimeout(resolve, delay));

            // Retry with raw axios (not the intercepted instance) to avoid
            // extractData processing the result twice on the original chain.
            const config = { ...axiosError.config, __rateLimitRetry: attempt };
            return axios(config);
          }

          logRetriesExhausted();
        }

        throw error;
      },
    },
  },
];

const logResponseHeaders = (response: AxiosResponse) => {
  if (!__DEV__) return;
  const h = response.headers as Record<string, string>;
  const method = response.config?.method?.toUpperCase();
  const endpoint = response.config?.url || 'unknown';
  const limit = h[HEADER_RATELIMIT_LIMIT];
  const remaining = h[HEADER_RATELIMIT_REMAINING];
  const reset = h[HEADER_RATELIMIT_RESET];
  if (limit || remaining || reset) {
    logger.info(`[RateLimit] ${method} ${endpoint} → limit=${limit} remaining=${remaining} reset=${reset}`);
  }
};

const logErrorHeaders = (axiosError: AxiosErrorLike) => {
  if (!__DEV__ || !axiosError.response?.headers) return;
  const h = axiosError.response.headers;
  const method = axiosError.config?.method?.toUpperCase();
  const endpoint = axiosError.config?.url || 'unknown';
  const status = axiosError.response.status;
  logger.warn(
    `[RateLimit] ${method} ${endpoint} → ${status} | ` +
      `limit=${h[HEADER_RATELIMIT_LIMIT]} remaining=${h[HEADER_RATELIMIT_REMAINING]} reset=${h[HEADER_RATELIMIT_RESET]}`,
  );
};

const logRetry = (attempt: number, delay: number) => {
  logger.warn(`[RateLimit] 429 received, retry ${attempt}/${MAX_RATE_LIMIT_RETRIES} after ${delay}ms`);
};

const logRetriesExhausted = () => {
  logger.error(`[RateLimit] 429 max retries (${MAX_RATE_LIMIT_RETRIES}) exhausted`);
};
