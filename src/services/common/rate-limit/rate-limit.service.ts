import { logger } from '@internxt-mobile/services/common';

interface RateLimitState {
  limit: number;
  remaining: number;
  resetMs: number;
}

interface EndpointConfig {
  baseURL?: string;
  url?: string;
}

/**
 * Individual patterns for dynamic ID path segments:
 * - UUIDs: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 * - Hex IDs (12+ chars): c6fe170df34863c173430633 (MongoDB ObjectIDs, etc.)
 * - Numeric IDs: 12345
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX_ID_PATTERN = /^[0-9a-f]{12,}$/i;
const NUMERIC_ID_PATTERN = /^\d+$/;

const isIdSegment = (segment: string): boolean => {
  if (!segment) return false;
  return UUID_PATTERN.test(segment) || HEX_ID_PATTERN.test(segment) || NUMERIC_ID_PATTERN.test(segment);
};

const normalizePathSegments = (pathname: string): string => {
  return pathname
    .split('/')
    .map((segment) => (isIdSegment(segment) ? ':id' : segment))
    .join('/');
};

const UNKNOWN_ENDPOINT = 'unknown';

export const HTTP_TOO_MANY_REQUESTS = 429;

export const HEADER_RATELIMIT_LIMIT = 'x-internxt-ratelimit-limit';
export const HEADER_RATELIMIT_REMAINING = 'x-internxt-ratelimit-remaining';
export const HEADER_RATELIMIT_RESET = 'x-internxt-ratelimit-reset';
export const HEADER_RETRY_AFTER = 'retry-after';

const THROTTLE_THRESHOLD = 0.4;
const MAX_THROTTLE_DELAY_MS = 2000;
export const MAX_RATE_LIMIT_RETRIES = 3;
const RETRY_BUFFER_MS = 2000;
const BASE_BACKOFF_MS = 3000;
const MAX_BACKOFF_MS = 5000;

/**
 * Extracts a normalized endpoint key from an axios config.
 * Combines baseURL + url, strips query params, and replaces
 * UUIDs and numeric IDs with `:id` for consistent grouping.
 *
 * Examples:
 *   { baseURL: "https://gw.internxt.com/drive", url: "/folders/abc-uuid/content" }
 *     → "https://gw.internxt.com/drive/folders/:id/content"
 *   { url: "https://gw.internxt.com/payments/display-billing" }
 *     → "https://gw.internxt.com/payments/display-billing"
 */
export const extractEndpointKey = (config: EndpointConfig): string => {
  const base = config.baseURL ?? '';
  const path = config.url ?? '';
  if (!base && !path) return UNKNOWN_ENDPOINT;

  let fullUrl: string;
  if (base.endsWith('/') && path.startsWith('/')) {
    fullUrl = base + path.slice(1);
  } else if (base && path && !base.endsWith('/') && !path.startsWith('/')) {
    fullUrl = base + '/' + path;
  } else {
    fullUrl = base + path;
  }

  try {
    const urlObj = new URL(fullUrl);
    const normalizedPath = normalizePathSegments(urlObj.pathname);
    return `${urlObj.origin}${normalizedPath}`;
  } catch {
    const pathWithoutQuery = fullUrl.split('?')[0];
    return normalizePathSegments(pathWithoutQuery);
  }
};

class RateLimitService {
  private readonly states = new Map<string, RateLimitState>();

  updateFromHeaders(headers: Record<string, string>, endpointKey: string): void {
    const limit = this.parseHeader(headers, HEADER_RATELIMIT_LIMIT);
    const remaining = this.parseHeader(headers, HEADER_RATELIMIT_REMAINING);
    const reset = this.parseHeader(headers, HEADER_RATELIMIT_RESET);

    if (limit === null || remaining === null || reset === null) return;

    this.states.set(endpointKey, {
      limit,
      remaining,
      resetMs: this.parseResetValue(reset),
    });
  }

  shouldThrottle(endpointKey: string): boolean {
    const state = this.states.get(endpointKey);
    if (!state) return false;
    const isQuotaBelowThreshold = state.remaining < state.limit * THROTTLE_THRESHOLD;
    return isQuotaBelowThreshold;
  }

  async waitIfNeeded(endpointKey: string): Promise<void> {
    const state = this.states.get(endpointKey);
    if (!state || !this.shouldThrottle(endpointKey)) return;

    const { remaining, resetMs } = state;
    const timeUntilReset = Math.max(0, resetMs - Date.now());

    const isQuotaExhausted = remaining <= 0 && timeUntilReset > 0;
    if (isQuotaExhausted) {
      const delay = Math.min(timeUntilReset + RETRY_BUFFER_MS, MAX_BACKOFF_MS);
      logger.info(`[RateLimit] ${endpointKey} limit reached, waiting ${delay}ms until reset`);
      await this.sleep(delay);
      return;
    }

    const isQuotaLow = remaining > 0 && timeUntilReset > 0;
    if (isQuotaLow) {
      const delay = Math.min(timeUntilReset / remaining, MAX_THROTTLE_DELAY_MS);
      logger.info(`[RateLimit] ${endpointKey} throttling: ${remaining} left, waiting ${Math.round(delay)}ms`);
      await this.sleep(delay);
    }
  }

  getRetryDelay(retryAfterHeader?: string, endpointKey?: string): number {
    if (retryAfterHeader) {
      const seconds = Number.parseInt(retryAfterHeader, 10);
      const isValidRetryAfter = !Number.isNaN(seconds) && seconds > 0;
      if (isValidRetryAfter) return seconds * 1000;
    }

    const state = endpointKey ? this.states.get(endpointKey) : undefined;
    if (state) {
      const timeUntilReset = state.resetMs - Date.now();
      const isResetPending = timeUntilReset > 0;
      if (isResetPending) return Math.min(timeUntilReset + RETRY_BUFFER_MS, MAX_BACKOFF_MS);
    }

    return BASE_BACKOFF_MS;
  }

  /**
   * Parse reset value heuristically:
   * - > 1e12: epoch milliseconds
   * - > 1e9: epoch seconds
   * - > 1e6: microseconds remaining (backend returns µs, e.g. 33293277 µs ≈ 33s)
   * - > 1000: milliseconds remaining
   * - otherwise: seconds remaining
   */
  private parseResetValue(value: number): number {
    const isEpochMs = value > 1e12;
    if (isEpochMs) return value;

    const isEpochSeconds = value > 1e9;
    if (isEpochSeconds) return value * 1000;

    const isMicroseconds = value > 1e6;
    if (isMicroseconds) return Date.now() + value / 1000;

    const isMilliseconds = value > 1000;
    if (isMilliseconds) return Date.now() + value;

    return Date.now() + value * 1000;
  }

  private parseHeader(headers: Record<string, string>, key: string): number | null {
    const val = headers[key] ?? headers[key.toLowerCase()];
    if (val === undefined || val === null) return null;
    const num = Number.parseInt(String(val), 10);
    return Number.isNaN(num) ? null : num;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const rateLimitService = new RateLimitService();
