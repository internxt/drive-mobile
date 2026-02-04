import { extractEndpointKey, rateLimitService } from './rate-limit.service';

const makeHeaders = (limit: number, remaining: number, reset: number): Record<string, string> => ({
  'x-ratelimit-limit': String(limit),
  'x-ratelimit-remaining': String(remaining),
  'x-ratelimit-reset': String(reset),
});

describe('extractEndpointKey', () => {
  describe('when joining baseURL and url', () => {
    it('when url starts with /, then joins correctly', () => {
      const result = extractEndpointKey({
        baseURL: 'https://gateway.internxt.com/drive',
        url: '/auth/login',
      });
      expect(result).toBe('https://gateway.internxt.com/drive/auth/login');
    });

    it('when url does NOT start with /, then adds separator', () => {
      const result = extractEndpointKey({
        baseURL: 'https://gateway.internxt.com/drive',
        url: 'folders/content/some-id/files',
      });
      expect(result).toContain('/drive/folders/');
    });

    it('when baseURL ends with / and url starts with /, then does not double slash', () => {
      const result = extractEndpointKey({
        baseURL: 'https://gateway.internxt.com/drive/',
        url: '/files/recents',
      });
      expect(result).toBe('https://gateway.internxt.com/drive/files/recents');
    });

    it('when only url is provided (direct axios), then uses full url', () => {
      const result = extractEndpointKey({
        url: 'https://gateway.internxt.com/payments/display-billing',
      });
      expect(result).toBe('https://gateway.internxt.com/payments/display-billing');
    });

    it('when both are empty, then returns unknown', () => {
      expect(extractEndpointKey({})).toBe('unknown');
      expect(extractEndpointKey({ baseURL: '', url: '' })).toBe('unknown');
    });
  });

  describe('when normalizing UUID path segments', () => {
    it('when path contains a UUID, then replaces with :id', () => {
      const result = extractEndpointKey({
        baseURL: 'https://gateway.internxt.com/drive',
        url: '/folders/c6fe170d-f348-63c1-7343-0633abcdef12/content',
      });
      expect(result).toBe('https://gateway.internxt.com/drive/folders/:id/content');
    });

    it('when path contains multiple UUIDs, then replaces all', () => {
      const result = extractEndpointKey({
        baseURL: 'https://gateway.internxt.com/drive',
        url: '/folders/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/files/11111111-2222-3333-4444-555555555555',
      });
      expect(result).toBe('https://gateway.internxt.com/drive/folders/:id/files/:id');
    });
  });

  describe('when normalizing hex ID path segments (MongoDB ObjectIDs)', () => {
    it('when path has a 24-char hex id, then replaces with :id', () => {
      const result = extractEndpointKey({
        baseURL: 'https://gateway.internxt.com/network',
        url: '/buckets/c6fe170df34863c173430633/files',
      });
      expect(result).toBe('https://gateway.internxt.com/network/buckets/:id/files');
    });

    it('when path has multiple hex ids, then replaces all', () => {
      const result = extractEndpointKey({
        baseURL: 'https://gateway.internxt.com/network',
        url: '/buckets/c6fe170df34863c173430633/files/c5bf086c78a0ada492d1f/info',
      });
      expect(result).toBe('https://gateway.internxt.com/network/buckets/:id/files/:id/info');
    });

    it('when hex id starts with digits, then replaces the full segment', () => {
      const result = extractEndpointKey({
        baseURL: 'https://gateway.internxt.com/network',
        url: '/buckets/c6fe170df34863c173430633/files/5bf086c78a0ada492d1f/info',
      });
      expect(result).toBe('https://gateway.internxt.com/network/buckets/:id/files/:id/info');
    });
  });

  describe('when normalizing numeric path segments', () => {
    it('when path has a pure numeric segment, then replaces with :id', () => {
      const result = extractEndpointKey({
        baseURL: 'https://gateway.internxt.com/drive',
        url: '/files/12345/info',
      });
      expect(result).toBe('https://gateway.internxt.com/drive/files/:id/info');
    });

    it('when path has mixed text and numbers, then does NOT replace', () => {
      const result = extractEndpointKey({
        baseURL: 'https://gateway.internxt.com/drive',
        url: '/files/recents',
      });
      expect(result).toBe('https://gateway.internxt.com/drive/files/recents');
    });
  });

  describe('when handling query parameters', () => {
    it('when url has query params, then strips them', () => {
      const result = extractEndpointKey({
        baseURL: 'https://gateway.internxt.com/drive',
        url: '/files?limit=50&offset=0',
      });
      expect(result).toBe('https://gateway.internxt.com/drive/files');
    });
  });

  describe('when handling real endpoints from logs', () => {
    it('drive auth login', () => {
      expect(extractEndpointKey({ baseURL: 'https://gateway.internxt.com/drive', url: '/auth/login' })).toBe(
        'https://gateway.internxt.com/drive/auth/login',
      );
    });

    it('drive users usage', () => {
      expect(extractEndpointKey({ baseURL: 'https://gateway.internxt.com/drive', url: '/users/usage' })).toBe(
        'https://gateway.internxt.com/drive/users/usage',
      );
    });

    it('drive users limit', () => {
      expect(extractEndpointKey({ baseURL: 'https://gateway.internxt.com/drive', url: '/users/limit' })).toBe(
        'https://gateway.internxt.com/drive/users/limit',
      );
    });

    it('drive files recents', () => {
      expect(extractEndpointKey({ baseURL: 'https://gateway.internxt.com/drive', url: '/files/recents' })).toBe(
        'https://gateway.internxt.com/drive/files/recents',
      );
    });

    it('drive folders content with uuid', () => {
      expect(
        extractEndpointKey({
          baseURL: 'https://gateway.internxt.com/drive',
          url: '/folders/content/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/files',
        }),
      ).toBe('https://gateway.internxt.com/drive/folders/content/:id/files');
    });

    it('drive sharings (url without leading /)', () => {
      expect(extractEndpointKey({ baseURL: 'https://gateway.internxt.com/drive', url: 'sharings/folders' })).toBe(
        'https://gateway.internxt.com/drive/sharings/folders',
      );
    });

    it('network buckets with hex ids', () => {
      expect(
        extractEndpointKey({
          baseURL: 'https://gateway.internxt.com/network',
          url: '/buckets/c6fe170df34863c173430633/files/a73b3f5dfe500088647b6/info',
        }),
      ).toBe('https://gateway.internxt.com/network/buckets/:id/files/:id/info');
    });

    it('network buckets with digit-starting hex ids', () => {
      expect(
        extractEndpointKey({
          baseURL: 'https://gateway.internxt.com/network',
          url: '/buckets/c6fe170df34863c173430633/files/65c5bf086c78a0ada492d1f/info',
        }),
      ).toBe('https://gateway.internxt.com/network/buckets/:id/files/:id/info');
    });
  });

  describe('when short hex words appear in paths', () => {
    it('when a segment is a known word like "cafe", then does NOT replace', () => {
      const result = extractEndpointKey({
        baseURL: 'https://example.com',
        url: '/api/dead/beef',
      });
      expect(result).toBe('https://example.com/api/dead/beef');
    });
  });
});

describe('RateLimitService', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('updateFromHeaders', () => {
    it('when all rate limit headers are present, then stores state for the endpoint', () => {
      const endpoint = 'update-all-headers';
      rateLimitService.updateFromHeaders(makeHeaders(200, 180, Date.now() + 60000), endpoint);

      expect(rateLimitService.shouldThrottle(endpoint)).toBe(false);
    });

    it('when limit header is missing, then does not store state', () => {
      const endpoint = 'update-missing-limit';
      rateLimitService.updateFromHeaders({ 'x-ratelimit-remaining': '100', 'x-ratelimit-reset': '1000' }, endpoint);

      expect(rateLimitService.shouldThrottle(endpoint)).toBe(false);
    });

    it('when remaining header is missing, then does not store state', () => {
      const endpoint = 'update-missing-remaining';
      rateLimitService.updateFromHeaders({ 'x-ratelimit-limit': '200', 'x-ratelimit-reset': '1000' }, endpoint);

      expect(rateLimitService.shouldThrottle(endpoint)).toBe(false);
    });

    it('when reset header is missing, then does not store state', () => {
      const endpoint = 'update-missing-reset';
      rateLimitService.updateFromHeaders({ 'x-ratelimit-limit': '200', 'x-ratelimit-remaining': '100' }, endpoint);

      expect(rateLimitService.shouldThrottle(endpoint)).toBe(false);
    });

    it('when header values are non-numeric, then does not store state', () => {
      const endpoint = 'update-non-numeric';
      rateLimitService.updateFromHeaders(
        { 'x-ratelimit-limit': 'abc', 'x-ratelimit-remaining': '100', 'x-ratelimit-reset': '1000' },
        endpoint,
      );

      expect(rateLimitService.shouldThrottle(endpoint)).toBe(false);
    });

    it('when two endpoints receive headers, then states are independent', () => {
      const endpointA = 'update-independent-a';
      const endpointB = 'update-independent-b';
      const futureReset = Date.now() + 60000;

      rateLimitService.updateFromHeaders(makeHeaders(200, 10, futureReset), endpointA);
      rateLimitService.updateFromHeaders(makeHeaders(200, 180, futureReset), endpointB);

      expect(rateLimitService.shouldThrottle(endpointA)).toBe(true);
      expect(rateLimitService.shouldThrottle(endpointB)).toBe(false);
    });
  });

  describe('shouldThrottle', () => {
    it('when no state exists for the endpoint, then returns false', () => {
      expect(rateLimitService.shouldThrottle('throttle-no-state')).toBe(false);
    });

    it('when remaining is above 40% of limit, then returns false', () => {
      const endpoint = 'throttle-above';
      rateLimitService.updateFromHeaders(makeHeaders(200, 81, Date.now() + 60000), endpoint);

      expect(rateLimitService.shouldThrottle(endpoint)).toBe(false);
    });

    it('when remaining equals 40% of limit, then returns false', () => {
      const endpoint = 'throttle-equal';
      rateLimitService.updateFromHeaders(makeHeaders(200, 80, Date.now() + 60000), endpoint);

      expect(rateLimitService.shouldThrottle(endpoint)).toBe(false);
    });

    it('when remaining is below 40% of limit, then returns true', () => {
      const endpoint = 'throttle-below';
      rateLimitService.updateFromHeaders(makeHeaders(200, 79, Date.now() + 60000), endpoint);

      expect(rateLimitService.shouldThrottle(endpoint)).toBe(true);
    });

    it('when remaining is 0, then returns true', () => {
      const endpoint = 'throttle-zero';
      rateLimitService.updateFromHeaders(makeHeaders(200, 0, Date.now() + 60000), endpoint);

      expect(rateLimitService.shouldThrottle(endpoint)).toBe(true);
    });
  });

  describe('waitIfNeeded', () => {
    it('when no state exists, then returns immediately without sleeping', async () => {
      const spy = jest.spyOn(global, 'setTimeout');
      await rateLimitService.waitIfNeeded('wait-no-state');

      const sleepCalls = spy.mock.calls.filter((args) => typeof args[1] === 'number' && args[1] > 0);
      expect(sleepCalls).toHaveLength(0);
    });

    it('when remaining is above threshold, then returns immediately', async () => {
      const spy = jest.spyOn(global, 'setTimeout');
      const endpoint = 'wait-above-threshold';
      rateLimitService.updateFromHeaders(makeHeaders(200, 100, Date.now() + 60000), endpoint);

      await rateLimitService.waitIfNeeded(endpoint);

      const sleepCalls = spy.mock.calls.filter((args) => typeof args[1] === 'number' && args[1] > 0);
      expect(sleepCalls).toHaveLength(0);
    });

    it('when quota is exhausted, then waits with delay capped at MAX_BACKOFF_MS', async () => {
      jest.useFakeTimers();
      const sleepSpy = jest.spyOn(global, 'setTimeout');
      const endpoint = 'wait-exhausted';
      const now = Date.now();
      rateLimitService.updateFromHeaders(makeHeaders(200, 0, now + 10000), endpoint);

      const waitPromise = rateLimitService.waitIfNeeded(endpoint);
      jest.advanceTimersByTime(5000);
      await waitPromise;

      // timeUntilReset ≈ 10000, delay = min(10000 + 2000, 5000) = 5000 (MAX_BACKOFF_MS)
      expect(sleepSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
      jest.useRealTimers();
    });

    it('when quota is low, then waits with proportional delay', async () => {
      jest.useFakeTimers();
      const sleepSpy = jest.spyOn(global, 'setTimeout');
      const endpoint = 'wait-low';
      const now = Date.now();
      // remaining=20, timeUntilReset≈10000 → delay = min(10000/20, 2000) = 500ms
      rateLimitService.updateFromHeaders(makeHeaders(200, 20, now + 10000), endpoint);

      const waitPromise = rateLimitService.waitIfNeeded(endpoint);
      jest.advanceTimersByTime(500);
      await waitPromise;

      expect(sleepSpy).toHaveBeenCalledWith(expect.any(Function), 500);
      jest.useRealTimers();
    });

    it('when quota is low but proportional delay exceeds cap, then caps at MAX_THROTTLE_DELAY_MS', async () => {
      jest.useFakeTimers();
      const sleepSpy = jest.spyOn(global, 'setTimeout');
      const endpoint = 'wait-low-capped';
      const now = Date.now();
      // remaining=1, timeUntilReset≈60000 → delay = min(60000/1, 2000) = 2000ms
      rateLimitService.updateFromHeaders(makeHeaders(200, 1, now + 60000), endpoint);

      const waitPromise = rateLimitService.waitIfNeeded(endpoint);
      jest.advanceTimersByTime(2000);
      await waitPromise;

      expect(sleepSpy).toHaveBeenCalledWith(expect.any(Function), 2000);
      jest.useRealTimers();
    });
  });

  describe('getRetryDelay', () => {
    it('when retry-after header is present and valid, then returns its value in ms', () => {
      const delay = rateLimitService.getRetryDelay('30');
      expect(delay).toBe(30000);
    });

    it('when retry-after header is 0, then ignores it and falls back', () => {
      const delay = rateLimitService.getRetryDelay('0');
      // 0 is not > 0, so falls back to BASE_BACKOFF_MS
      expect(delay).toBe(3000);
    });

    it('when retry-after header is non-numeric, then ignores it and falls back', () => {
      const delay = rateLimitService.getRetryDelay('abc');
      expect(delay).toBe(3000);
    });

    it('when endpoint has state with pending reset, then uses time until reset', () => {
      const endpoint = 'retry-with-state';
      const now = Date.now();
      // resetMs in future, timeUntilReset ≈ 3000 → delay = min(3000 + 2000, 5000) = 5000
      rateLimitService.updateFromHeaders(makeHeaders(200, 0, now + 3000), endpoint);

      const delay = rateLimitService.getRetryDelay(undefined, endpoint);
      expect(delay).toBe(5000);
    });

    it('when endpoint has state with short reset, then returns proportional delay', () => {
      const endpoint = 'retry-short-reset';
      const now = Date.now();
      // resetMs in future, timeUntilReset ≈ 1000 → delay = min(1000 + 2000, 5000) = 3000
      rateLimitService.updateFromHeaders(makeHeaders(200, 0, now + 1000), endpoint);

      const delay = rateLimitService.getRetryDelay(undefined, endpoint);
      expect(delay).toBe(3000);
    });

    it('when no retry-after and no endpoint state, then returns BASE_BACKOFF_MS', () => {
      const delay = rateLimitService.getRetryDelay(undefined, 'retry-no-state');
      expect(delay).toBe(3000);
    });

    it('when retry-after header is present, then it takes priority over endpoint state', () => {
      const endpoint = 'retry-header-priority';
      rateLimitService.updateFromHeaders(makeHeaders(200, 0, Date.now() + 60000), endpoint);

      const delay = rateLimitService.getRetryDelay('2', endpoint);
      expect(delay).toBe(2000);
    });
  });

  describe('parseResetValue (via updateFromHeaders + getRetryDelay)', () => {
    it('when reset is epoch seconds (> 1e9), then converts to epoch ms', () => {
      const now = 1770190042000;
      jest.spyOn(Date, 'now').mockReturnValue(now);
      const endpoint = 'parse-epoch-seconds';
      // 1770190044 is epoch seconds → resetMs = 1770190044000
      rateLimitService.updateFromHeaders(makeHeaders(200, 0, 1770190044), endpoint);

      // timeUntilReset = 1770190044000 - 1770190042000 = 2000
      // delay = min(2000 + 2000, 5000) = 4000
      expect(rateLimitService.getRetryDelay(undefined, endpoint)).toBe(4000);
    });

    it('when reset is epoch ms (> 1e12), then uses as-is', () => {
      const now = 1770190042000;
      jest.spyOn(Date, 'now').mockReturnValue(now);
      const endpoint = 'parse-epoch-ms';
      // 1770190044000 is epoch ms → resetMs = 1770190044000
      rateLimitService.updateFromHeaders(makeHeaders(200, 0, 1770190044000), endpoint);

      // timeUntilReset = 1770190044000 - 1770190042000 = 2000
      // delay = min(2000 + 2000, 5000) = 4000
      expect(rateLimitService.getRetryDelay(undefined, endpoint)).toBe(4000);
    });

    it('when reset is microseconds remaining (> 1e6), then converts to absolute ms', () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);
      const endpoint = 'parse-microseconds';
      // 2000000 µs = 2000ms → resetMs = 1000000 + 2000 = 1002000
      rateLimitService.updateFromHeaders(makeHeaders(200, 0, 2000000), endpoint);

      // timeUntilReset = 1002000 - 1000000 = 2000
      // delay = min(2000 + 2000, 5000) = 4000
      expect(rateLimitService.getRetryDelay(undefined, endpoint)).toBe(4000);
    });

    it('when reset is milliseconds remaining (> 1000), then adds to Date.now()', () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);
      const endpoint = 'parse-milliseconds';
      // 1500ms remaining → resetMs = 1000000 + 1500 = 1001500
      rateLimitService.updateFromHeaders(makeHeaders(200, 0, 1500), endpoint);

      // timeUntilReset = 1001500 - 1000000 = 1500
      // delay = min(1500 + 2000, 5000) = 3500
      expect(rateLimitService.getRetryDelay(undefined, endpoint)).toBe(3500);
    });

    it('when reset is seconds remaining (<= 1000), then converts to ms and adds to Date.now()', () => {
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);
      const endpoint = 'parse-seconds';
      // 60s → resetMs = 1000000 + 60000 = 1060000
      rateLimitService.updateFromHeaders(makeHeaders(200, 0, 60), endpoint);

      // timeUntilReset = 1060000 - 1000000 = 60000
      // delay = min(60000 + 2000, 5000) = 5000 (capped)
      expect(rateLimitService.getRetryDelay(undefined, endpoint)).toBe(5000);
    });
  });

  describe('parseHeader (via updateFromHeaders)', () => {
    it('when headers have string numeric values, then parses them correctly', () => {
      const endpoint = 'parse-header-numeric';
      rateLimitService.updateFromHeaders(makeHeaders(1000, 500, Date.now() + 60000), endpoint);

      // remaining 500 is 50% of 1000 → above threshold → no throttle
      expect(rateLimitService.shouldThrottle(endpoint)).toBe(false);
    });

    it('when a header value is a float string, then parses only the integer part', () => {
      const endpoint = 'parse-header-float';
      rateLimitService.updateFromHeaders(
        { 'x-ratelimit-limit': '200.5', 'x-ratelimit-remaining': '10.9', 'x-ratelimit-reset': '60.3' },
        endpoint,
      );

      // parseInt('200.5') = 200, parseInt('10.9') = 10 → 10 < 200*0.4=80 → throttle
      expect(rateLimitService.shouldThrottle(endpoint)).toBe(true);
    });

    it('when a header value is empty string, then does not store state', () => {
      const endpoint = 'parse-header-empty';
      rateLimitService.updateFromHeaders(
        { 'x-ratelimit-limit': '', 'x-ratelimit-remaining': '100', 'x-ratelimit-reset': '1000' },
        endpoint,
      );

      expect(rateLimitService.shouldThrottle(endpoint)).toBe(false);
    });

    it('when headers are completely missing, then does not store state', () => {
      const endpoint = 'parse-header-none';
      rateLimitService.updateFromHeaders({}, endpoint);

      expect(rateLimitService.shouldThrottle(endpoint)).toBe(false);
    });

    it('when limit is 0, then stores state but never throttles (0 * threshold = 0)', () => {
      const endpoint = 'parse-header-zero-limit';
      rateLimitService.updateFromHeaders(makeHeaders(0, 0, Date.now() + 60000), endpoint);

      // remaining 0 < 0 * 0.4 = 0 → false (not strictly less than)
      expect(rateLimitService.shouldThrottle(endpoint)).toBe(false);
    });
  });
});
