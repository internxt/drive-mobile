import { HTTP_FORBIDDEN } from '../common/httpStatusCodes';

/**
 * Reads the HTTP status of a failed request, whether the error is the one the mail SDK threw or one of
 * the mail errors wrapping it.
 *
 * @param error - The error thrown by a request.
 * @returns The HTTP status, or undefined when the error does not carry one.
 */
export const readHttpStatus = (error: unknown): number | undefined => {
  const requestError = error as { status?: unknown; cause?: { status?: unknown } } | null | undefined;
  const httpStatus = requestError?.status ?? requestError?.cause?.status;
  return typeof httpStatus === 'number' ? httpStatus : undefined;
};

const MAIL_NOT_SET_UP_CODE = 'MAIL_NOT_SETUP';

export const isMailNotSetUpError = (error: unknown): boolean => {
  const cause = (error as { cause?: unknown } | null | undefined)?.cause;
  const requestFailure = (cause ?? error ?? {}) as { data?: { code?: unknown } | null };
  return readHttpStatus(error) === HTTP_FORBIDDEN && requestFailure.data?.code === MAIL_NOT_SET_UP_CODE;
};

export const MAX_LOGGED_REASON_LENGTH = 200;

/**
 * Reads the reason out of a response body, which is either the text itself or an object with the
 * reason under `message` or `error`.
 *
 * @param responseBody - Body of the failed response, in whatever shape the server sent it.
 * @returns The first characters of the reason, or undefined when the body does not hold one.
 */
const readServerReason = (responseBody: unknown): string | undefined => {
  if (typeof responseBody === 'string') {
    return responseBody.slice(0, MAX_LOGGED_REASON_LENGTH);
  }
  if (responseBody !== null && typeof responseBody === 'object') {
    const { message, error } = responseBody as { message?: unknown; error?: unknown };
    const reason = message ?? error;
    if (typeof reason === 'string') {
      return reason.slice(0, MAX_LOGGED_REASON_LENGTH);
    }
  }

  return undefined;
};

/**
 * Describes an error for the log: a failed request by what the server answered, any other error by the
 * beginning of the message of its cause or, without one, of its own. Neither the stack nor the body of
 * the request is included.
 *
 * @returns The description, with undefined for whatever the error does not carry.
 */
export const describeErrorForLog = (error: unknown): Record<string, unknown> => {
  const cause = (error as { cause?: unknown } | null | undefined)?.cause;
  const underlyingFailure = cause ?? error;
  const requestFailure = (underlyingFailure ?? {}) as { data?: unknown; xRequestId?: string };
  const status = readHttpStatus(error);
  const isFailedRequest = status !== undefined;

  return {
    errorName: error instanceof Error ? error.name : undefined,
    causeName: cause instanceof Error ? cause.name : undefined,
    message:
      !isFailedRequest && underlyingFailure instanceof Error
        ? underlyingFailure.message.slice(0, MAX_LOGGED_REASON_LENGTH)
        : undefined,
    status,
    reason: readServerReason(requestFailure.data),
    requestId: requestFailure.xRequestId,
  };
};
