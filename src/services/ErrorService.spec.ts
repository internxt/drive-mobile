import strings from '../../assets/lang/strings';
import AppError from '../types';
import { HTTP_TOO_MANY_REQUESTS } from './common';
import errorService from './ErrorService';

describe('ErrorService', () => {
  describe('castError', () => {
    describe('extractStatus - multiple locations', () => {
      it('when status is directly in error.status, extracts it correctly', () => {
        const error = { status: 404, message: 'Not found' };
        const result = errorService.castError(error);

        expect(result).toBeInstanceOf(AppError);
        expect(result.status).toBe(404);
        expect(result.message).toBe('Not found');
      });

      it('when status is in error.response.status (Axios format), extracts it correctly', () => {
        const error = {
          response: {
            status: 500,
            data: { message: 'Internal server error' },
          },
        };
        const result = errorService.castError(error);

        expect(result).toBeInstanceOf(AppError);
        expect(result.status).toBe(500);
        expect(result.message).toBe('Internal server error');
      });

      it('when status is in both places, prioritizes error.status', () => {
        const error = {
          status: 403,
          message: 'Forbidden',
          response: {
            status: 404,
            data: { message: 'Not found' },
          },
        };
        const result = errorService.castError(error);

        expect(result.status).toBe(403);
        expect(result.message).toBe('Forbidden');
      });

      it('when there is no status in any location, returns generic error', () => {
        const error = { message: 'Network error' };
        const result = errorService.castError(error);

        expect(result.status).toBeUndefined();
        expect(result.message).toBe(strings.errors.genericError);
      });

      it('when status is a string number in error.status, parses and extracts it correctly', () => {
        const error = { status: '404', message: 'Not found' };
        const result = errorService.castError(error);

        expect(result.status).toBe(404);
        expect(result.message).toBe('Not found');
      });

      it('when status is a string number in error.response.status, parses and extracts it correctly', () => {
        const error = {
          response: {
            status: '500',
            data: { message: 'Internal server error' },
          },
        };
        const result = errorService.castError(error);

        expect(result.status).toBe(500);
        expect(result.message).toBe('Internal server error');
      });

      it('when status is a string with leading/trailing spaces, parses it correctly', () => {
        const error = { status: '  429  ', message: 'Rate limit exceeded' };
        const result = errorService.castError(error, 'upload');

        expect(result.status).toBe(429);
        expect(result.message).toBe(strings.errors.rateLimitUpload);
      });

      it('when status is an invalid string (non-numeric), ignores it and returns generic error', () => {
        const error = { status: 'not-a-number', message: 'Some error' };
        const result = errorService.castError(error);

        expect(result.status).toBeUndefined();
        expect(result.message).toBe(strings.errors.genericError);
      });

      it('when status is out of valid HTTP range (e.g., 999), ignores it and returns generic error', () => {
        const error = { status: 999, message: 'Invalid status' };
        const result = errorService.castError(error);

        expect(result.status).toBeUndefined();
        expect(result.message).toBe(strings.errors.genericError);
      });

      it('when status is below valid HTTP range (e.g., 99), ignores it and returns generic error', () => {
        const error = { status: 99, message: 'Invalid status' };
        const result = errorService.castError(error);

        expect(result.status).toBeUndefined();
        expect(result.message).toBe(strings.errors.genericError);
      });

      it('when string status is at lower edge of error range (400), parses it correctly', () => {
        const error = { status: '400', message: 'Bad request' };
        const result = errorService.castError(error);

        expect(result.status).toBe(400);
        expect(result.message).toBe('Bad request');
      });

      it('when string status is at upper edge of error range (599), parses it correctly', () => {
        const error = { status: '599', message: 'Network error' };
        const result = errorService.castError(error);

        expect(result.status).toBe(599);
        expect(result.message).toBe('Network error');
      });

      it('when string status is informational (100-199), ignores it as not an error', () => {
        const error = { status: '100', message: 'Continue' };
        const result = errorService.castError(error);

        expect(result.status).toBeUndefined();
        expect(result.message).toBe(strings.errors.genericError);
      });

      it('when string status is successful (200-299), ignores it as not an error', () => {
        const error = { status: '200', message: 'OK' };
        const result = errorService.castError(error);

        expect(result.status).toBeUndefined();
        expect(result.message).toBe(strings.errors.genericError);
      });

      it('when status is a float string, parses only the integer part', () => {
        const error = { status: '404.5', message: 'Not found' };
        const result = errorService.castError(error);

        expect(result.status).toBe(404);
        expect(result.message).toBe('Not found');
      });
    });

    describe('extractMessage - multiple locations', () => {
      it('when message is directly in error.message, extracts it correctly', () => {
        const error = { status: 400, message: 'Bad request' };
        const result = errorService.castError(error);

        expect(result.message).toBe('Bad request');
      });

      it('when message is in error.response.data.message (API format), extracts it correctly', () => {
        const error = {
          response: {
            status: 401,
            data: { message: 'Unauthorized access' },
          },
        };
        const result = errorService.castError(error);

        expect(result.message).toBe('Unauthorized access');
      });

      it('when message is in both places, prioritizes error.message', () => {
        const error = {
          message: 'Direct message',
          response: {
            status: 400,
            data: { message: 'API message' },
          },
        };
        const result = errorService.castError(error);

        expect(result.message).toBe('Direct message');
      });

      it('when message is an empty string, ignores it and searches in response.data.message', () => {
        const error = {
          message: '   ',
          response: {
            status: 400,
            data: { message: 'Validation error' },
          },
        };
        const result = errorService.castError(error);

        expect(result.message).toBe('Validation error');
      });

      it('when there is no message anywhere but has status, returns generic error', () => {
        const error = {
          response: {
            status: 500,
            data: {},
          },
        };
        const result = errorService.castError(error);

        expect(result.message).toBe(strings.errors.genericError);
      });
    });

    describe('rate limit (429) - detection and contextual messages', () => {
      it('when receives 429 in error.status without context, returns generic rate limit message', () => {
        const error = {
          status: HTTP_TOO_MANY_REQUESTS,
          message: 'Rate limit exceeded',
        };
        const result = errorService.castError(error);

        expect(result.status).toBe(HTTP_TOO_MANY_REQUESTS);
        expect(result.message).toBe(strings.errors.rateLimitReached);
      });

      it('when receives 429 in error.response.status without context, returns generic rate limit message', () => {
        const error = {
          response: {
            status: HTTP_TOO_MANY_REQUESTS,
            data: { message: 'Too many requests' },
          },
        };
        const result = errorService.castError(error);

        expect(result.status).toBe(HTTP_TOO_MANY_REQUESTS);
        expect(result.message).toBe(strings.errors.rateLimitReached);
      });

      it('when receives 429 with "upload" context, returns specific upload message', () => {
        const error = {
          status: HTTP_TOO_MANY_REQUESTS,
          message: 'Rate limit exceeded',
        };
        const result = errorService.castError(error, 'upload');

        expect(result.status).toBe(HTTP_TOO_MANY_REQUESTS);
        expect(result.message).toBe(strings.errors.rateLimitUpload);
      });

      it('when receives 429 with "download" context, returns specific download message', () => {
        const error = {
          status: HTTP_TOO_MANY_REQUESTS,
          message: 'Rate limit exceeded',
        };
        const result = errorService.castError(error, 'download');

        expect(result.status).toBe(HTTP_TOO_MANY_REQUESTS);
        expect(result.message).toBe(strings.errors.rateLimitDownload);
      });

      it('when receives 429 with "content" context, returns specific content message', () => {
        const error = {
          status: HTTP_TOO_MANY_REQUESTS,
          message: 'Rate limit exceeded',
        };
        const result = errorService.castError(error, 'content');

        expect(result.status).toBe(HTTP_TOO_MANY_REQUESTS);
        expect(result.message).toBe(strings.errors.rateLimitContent);
      });

      it('when receives 429 from Axios format with "upload" context, returns correct message', () => {
        const error = {
          response: {
            status: HTTP_TOO_MANY_REQUESTS,
            headers: {
              'x-internxt-ratelimit-limit': '100',
              'x-internxt-ratelimit-remaining': '0',
              'x-internxt-ratelimit-reset': String(Date.now() + 60000),
            },
            data: { message: 'Rate limit exceeded' },
          },
        };
        const result = errorService.castError(error, 'upload');

        expect(result.status).toBe(HTTP_TOO_MANY_REQUESTS);
        expect(result.message).toBe(strings.errors.rateLimitUpload);
      });
    });

    describe('server errors (4xx/5xx) - different formats', () => {
      it('when receives error 400 with message, processes it correctly', () => {
        const error = {
          status: 400,
          message: 'Invalid request parameters',
        };
        const result = errorService.castError(error);

        expect(result.status).toBe(400);
        expect(result.message).toBe('Invalid request parameters');
      });

      it('when receives error 401 from API, processes it correctly', () => {
        const error = {
          response: {
            status: 401,
            data: { message: 'Authentication required' },
          },
        };
        const result = errorService.castError(error);

        expect(result.status).toBe(401);
        expect(result.message).toBe('Authentication required');
      });

      it('when receives error 403 with Spanish message, preserves it', () => {
        const error = {
          status: 403,
          message: 'No tienes permisos para acceder a este recurso',
        };
        const result = errorService.castError(error);

        expect(result.status).toBe(403);
        expect(result.message).toBe('No tienes permisos para acceder a este recurso');
      });

      it('when receives error 404 without message, returns generic error', () => {
        const error = {
          status: 404,
          message: '',
        };
        const result = errorService.castError(error);

        expect(result.status).toBeUndefined();
        expect(result.message).toBe(strings.errors.genericError);
      });

      it('when receives error 500 from server, processes it correctly', () => {
        const error = {
          response: {
            status: 500,
            data: { message: 'Internal server error' },
          },
        };
        const result = errorService.castError(error);

        expect(result.status).toBe(500);
        expect(result.message).toBe('Internal server error');
      });

      it('when receives error 503 (service unavailable), processes it correctly', () => {
        const error = {
          status: 503,
          message: 'Service temporarily unavailable',
        };
        const result = errorService.castError(error);

        expect(result.status).toBe(503);
        expect(result.message).toBe('Service temporarily unavailable');
      });
    });

    describe('edge cases and unexpected errors', () => {
      it('when receives null, returns generic error', () => {
        const result = errorService.castError(null);

        expect(result.status).toBeUndefined();
        expect(result.message).toBe(strings.errors.genericError);
      });

      it('when receives undefined, returns generic error', () => {
        const result = errorService.castError(undefined);

        expect(result.status).toBeUndefined();
        expect(result.message).toBe(strings.errors.genericError);
      });

      it('when receives a string, returns generic error', () => {
        const result = errorService.castError('Something went wrong');

        expect(result.status).toBeUndefined();
        expect(result.message).toBe(strings.errors.genericError);
      });

      it('when receives a number, returns generic error', () => {
        const result = errorService.castError(404);

        expect(result.status).toBeUndefined();
        expect(result.message).toBe(strings.errors.genericError);
      });

      it('when receives an empty object, returns generic error', () => {
        const result = errorService.castError({});

        expect(result.status).toBeUndefined();
        expect(result.message).toBe(strings.errors.genericError);
      });

      it('when status is not 4xx/5xx but has message, returns generic error', () => {
        const error = {
          status: 200,
          message: 'Success but treated as error',
        };
        const result = errorService.castError(error);

        expect(result.status).toBeUndefined();
        expect(result.message).toBe(strings.errors.genericError);
      });

      it('when status is 399 (out of range 400-599), returns generic error', () => {
        const error = {
          status: 399,
          message: 'Not a valid error status',
        };
        const result = errorService.castError(error);

        expect(result.status).toBeUndefined();
        expect(result.message).toBe(strings.errors.genericError);
      });

      it('when status is 600 (out of range 400-599), returns generic error', () => {
        const error = {
          status: 600,
          message: 'Not a valid error status',
        };
        const result = errorService.castError(error);

        expect(result.status).toBeUndefined();
        expect(result.message).toBe(strings.errors.genericError);
      });

      it('when status is valid but message has only spaces, returns generic error', () => {
        const error = {
          status: 500,
          message: '     ',
          response: {
            data: {},
          },
        };
        const result = errorService.castError(error);

        expect(result.status).toBeUndefined();
        expect(result.message).toBe(strings.errors.genericError);
      });
    });

    describe('extraction priority verification', () => {
      it('when 429 in error.status but different status in response, uses error.status', () => {
        const error = {
          status: HTTP_TOO_MANY_REQUESTS,
          message: 'Rate limit exceeded',
          response: {
            status: 500,
            data: { message: 'Server error' },
          },
        };
        const result = errorService.castError(error, 'upload');

        expect(result.status).toBe(HTTP_TOO_MANY_REQUESTS);
        expect(result.message).toBe(strings.errors.rateLimitUpload);
      });

      it('when direct message and message in response, uses direct message', () => {
        const error = {
          status: 400,
          message: 'Direct error message',
          response: {
            status: 400,
            data: { message: 'API error message' },
          },
        };
        const result = errorService.castError(error);

        expect(result.message).toBe('Direct error message');
      });
    });
  });
});
