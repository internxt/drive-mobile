import strings from '../../../../assets/lang/strings';
import { InternxtRecipientKeyMissingError, MailErrorName } from '../../../services/mail/errors';

type SendErrorMessages = typeof strings.screens.compose_email.errors;

/**
 * Reads the reason out of a response body, which is either the text itself or an object with the
 * reason under `message` or `error`.
 *
 * @param responseBody - Body of the failed response, in whatever shape the server sent it.
 * @returns The reason, or undefined when the body does not hold one.
 */
const readServerReason = (responseBody: unknown): string | undefined => {
  if (typeof responseBody === 'string') {
    return responseBody;
  }
  if (responseBody !== null && typeof responseBody === 'object') {
    const { message, error } = responseBody as { message?: unknown; error?: unknown };
    const reason = message ?? error;
    if (typeof reason === 'string') {
      return reason;
    }
  }

  return undefined;
};

/**
 * Describes a failed send for the log: the status, the reason and the request id. The response
 * body and the raw SDK error are left out, because the log is written to a file on the device and
 * they carry the recipients and the message envelope.
 *
 * @param error - Error thrown by the mail SDK.
 * @returns The status, the reason and the request id, when the error carries them.
 */
export const describeSendFailure = (error: unknown): Record<string, unknown> => {
  const cause = (error as { cause?: unknown })?.cause;
  const requestFailure = (cause ?? error ?? {}) as { status?: number; data?: unknown; xRequestId?: string };

  return {
    status: requestFailure.status,
    reason: readServerReason(requestFailure.data),
    requestId: requestFailure.xRequestId,
  };
};

export const SEND_ERROR_MESSAGES = new Map<string, (error: Error, messages: SendErrorMessages) => string>([
  [MailErrorName.NoRecipients, (_, messages) => messages.noRecipients],
  [MailErrorName.PrimaryRecipientMissing, (_, messages) => messages.primaryRecipientMissing],
  [
    MailErrorName.InternxtRecipientKeyMissing,
    (error, messages) =>
      error instanceof InternxtRecipientKeyMissingError
        ? (strings.formatString(messages.internxtKeyMissing, error.addresses.join(', ')) as string)
        : messages.sendFailed,
  ],
  [MailErrorName.RecipientKeyLookupFailed, (_, messages) => messages.keyLookupFailed],
  [MailErrorName.ActiveDomainsUnavailable, (_, messages) => messages.domainsUnavailable],
  [MailErrorName.ServerPublicKeyMissing, (_, messages) => messages.serverKeyMissing],
  [MailErrorName.BlindCopyNotDeliverable, (_, messages) => messages.blindCopyNotDeliverable],
]);

/**
 * Turns a send failure into the reason shown to the user.
 *
 * @param error - Error thrown while sending.
 * @returns The localized reason, or the generic one when the failure is not a known mail error.
 */
export const getSendErrorMessage = (error: unknown): string => {
  const messages = strings.screens.compose_email.errors;
  if (!(error instanceof Error)) {
    return messages.sendFailed;
  }

  const messageResolver = SEND_ERROR_MESSAGES.get(error.name);

  return messageResolver ? messageResolver(error, messages) : messages.sendFailed;
};
