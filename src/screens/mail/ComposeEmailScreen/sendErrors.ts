import strings from '../../../../assets/lang/strings';
import { InternxtRecipientKeyMissingError, MailErrorName } from '../../../services/mail/errors';

type SendErrorMessages = typeof strings.screens.compose_email.errors;

/**
 * Pulls the server side of a failed request out of an SDK error, which carries the
 * response body and request id that the error message alone does not include.
 *
 * @param error - Error thrown by the mail SDK.
 * @returns The status, response body and request id, when the error carries them.
 */
export const describeRequestFailure = (error: unknown): Record<string, unknown> => {
  const cause = (error as { cause?: unknown })?.cause;
  const source = (cause ?? error ?? {}) as { status?: number; data?: unknown; xRequestId?: string };

  return { status: source.status, responseBody: source.data, requestId: source.xRequestId, cause };
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
