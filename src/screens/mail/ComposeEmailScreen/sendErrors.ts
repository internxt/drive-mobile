import strings from '../../../../assets/lang/strings';
import { HTTP_TOO_MANY_REQUESTS } from '../../../services/common/httpStatusCodes';
import { formatMaxAttachmentSize } from '../../../services/mail/attachmentLimits';
import { readHttpStatus } from '../../../services/mail/errorDescription';
import {
  AttachmentTooLargeError,
  AttachmentUploadFailedError,
  ForwardedAttachmentUnavailableError,
  InternxtRecipientKeyMissingError,
  MailErrorName,
} from '../../../services/mail/errors';

type SendErrorMessages = typeof strings.screens.compose_email.errors;

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
        ? strings.formatString(messages.attachmentTooLarge, error.attachmentName, formatMaxAttachmentSize())
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
