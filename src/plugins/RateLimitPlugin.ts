import { HttpClient } from '@internxt/sdk/dist/shared/http/client';
import axios from 'axios';
import { extractEndpointKey, rateLimitInterceptors, rateLimitService } from '../services/common/rate-limit';
import { AppPlugin } from '../types';

/**
 * Registers rate limit interceptors at two levels:
 * - SDK HttpClient: intercepts all SDK calls before extractData/normalizeError
 * - Global axios: intercepts direct axios calls outside the SDK (PaymentService, downloads, etc.)
 *
 * Must be installed BEFORE AxiosPlugin so rate limit interceptors run first in the chain.
 */
const rateLimitPlugin: AppPlugin = {
  install(_store): void {
    HttpClient.setGlobalInterceptors(rateLimitInterceptors);

    axios.interceptors.request.use(
      async (config) => {
        const endpointKey = extractEndpointKey(config);
        await rateLimitService.waitIfNeeded(endpointKey);
        return config;
      },
      (error) => Promise.reject(error),
    );
    axios.interceptors.response.use(
      (response) => {
        if (response.headers) {
          const endpointKey = extractEndpointKey(response.config);
          rateLimitService.updateFromHeaders(response.headers as Record<string, string>, endpointKey);
        }
        return response;
      },
      (error) => {
        if (error.response?.headers) {
          const endpointKey = extractEndpointKey(error.config);
          rateLimitService.updateFromHeaders(error.response.headers as Record<string, string>, endpointKey);
        }
        return Promise.reject(error);
      },
    );
  },
};

export default rateLimitPlugin;
