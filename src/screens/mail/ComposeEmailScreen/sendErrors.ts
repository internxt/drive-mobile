import prettysize from 'prettysize';
import strings from '../../../../assets/lang/strings';
import { HTTP_TOO_MANY_REQUESTS } from '../../../services/common/httpStatusCodes';
import { MAX_ATTACHMENT_BYTES } from '../../../services/mail/attachmentLimits';
import {
  AttachmentTooLargeError,
  AttachmentUploadFailedError,
  ForwardedAttachmentUnavailableError,
  InternxtRecipientKeyMissingError,
  MailErrorName,
  readHttpStatus,
} from '../../../services/mail/errors';

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
  const requestFailure = (cause ?? error ?? {}) as { data?: unknown; xRequestId?: string };

  return {
    status: readHttpStatus(error),
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
  [
    MailErrorName.ForwardedAttachmentUnavailable,
    (error, messages) =>
      error instanceof ForwardedAttachmentUnavailableError
        ? (strings.formatString(messages.forwardedAttachmentUnavailable, error.attachmentName) as string)
        : messages.sendFailed,
  ],
  [
    MailErrorName.AttachmentTooLarge,
    (error, messages) =>
      error instanceof AttachmentTooLargeError
        ? strings.formatString(
            messages.attachmentTooLarge,
            error.attachmentName,
            prettysize(MAX_ATTACHMENT_BYTES, true),
          )
        : messages.sendFailed,
  ],
  [
    MailErrorName.AttachmentUploadFailed,
    (error, messages) =>
      error instanceof AttachmentUploadFailedError
        ? (strings.formatString(messages.attachmentUploadFailed, error.attachmentName) as string)
        : messages.sendFailed,
  ],
  [MailErrorName.ForwardedAttachmentsNotDecryptable, (_, messages) => messages.forwardedAttachmentsNotDecryptable],
]);

export const isSendRateLimited = (error: unknown): boolean => readHttpStatus(error) === HTTP_TOO_MANY_REQUESTS;

/**
 * Turns a send failure into the reason shown to the user.
 *
 * @param error - Error thrown while sending.
 * @returns The localized reason of a known mail error, the sending limit when the server throttled the
 * send, or the generic reason otherwise.
 */
export const getSendErrorMessage = (error: unknown): string => {
  const messages = strings.screens.compose_email.errors;
  if (!(error instanceof Error)) {
    return messages.sendFailed;
  }

  const messageResolver = SEND_ERROR_MESSAGES.get(error.name);
  if (messageResolver) {
    return messageResolver(error, messages);
  }

  return isSendRateLimited(error) ? messages.sendRateLimited : messages.sendFailed;
};
