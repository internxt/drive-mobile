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
 * Describes an error for the log: its name, the name of its cause, and for a failed request its
 * status, the reason the server gave and the request id. Nothing else the error carries is included,
 * neither its message nor its stack nor the body of the request.
 *
 * @param error - Any error.
 * @returns The description, with undefined for whatever the error does not carry.
 */
export const describeErrorForLog = (error: unknown): Record<string, unknown> => {
  const cause = (error as { cause?: unknown } | null | undefined)?.cause;
  const requestFailure = (cause ?? error ?? {}) as { data?: unknown; xRequestId?: string };

  return {
    errorName: error instanceof Error ? error.name : undefined,
    causeName: cause instanceof Error ? cause.name : undefined,
    status: readHttpStatus(error),
    reason: readServerReason(requestFailure.data),
    requestId: requestFailure.xRequestId,
  };
};
