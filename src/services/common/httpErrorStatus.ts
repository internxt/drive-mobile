import { HTTP_INTERNAL_SERVER_ERROR } from './httpStatusCodes';

export const getErrorStatus = (error: unknown): number | undefined => {
  const httpError = error as { status?: number; statusCode?: number } | undefined;
  return httpError?.status ?? httpError?.statusCode;
};

/**
 * Returns true for a 5xx response, and for a request that got no response (the SDK reports it as a 500).
 */
export const isServerError = (error: unknown): boolean => {
  const status = getErrorStatus(error);
  return status !== undefined && status >= HTTP_INTERNAL_SERVER_ERROR;
};
