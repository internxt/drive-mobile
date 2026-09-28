export const MailErrorName = {
  NoRecipients: 'NoRecipientsError',
  InternxtRecipientKeyMissing: 'InternxtRecipientKeyMissingError',
  RecipientKeyLookupFailed: 'RecipientKeyLookupFailedError',
  ActiveDomainsUnavailable: 'ActiveDomainsUnavailableError',
  ServerPublicKeyMissing: 'ServerPublicKeyMissingError',
  BlindCopyNotDeliverable: 'BlindCopyNotDeliverableError',
  PrimaryRecipientMissing: 'PrimaryRecipientMissingError',
  ForwardedAttachmentUnavailable: 'ForwardedAttachmentUnavailableError',
  AttachmentTooLarge: 'AttachmentTooLargeError',
  ForwardedAttachmentsNotDecryptable: 'ForwardedAttachmentsNotDecryptableError',
  AttachmentUploadFailed: 'AttachmentUploadFailedError',
} as const;

export class NoRecipientsError extends Error {
  constructor() {
    super('An email needs at least one recipient');
    this.name = MailErrorName.NoRecipients;
  }
}

export class InternxtRecipientKeyMissingError extends Error {
  constructor(public readonly addresses: string[]) {
    super('No published key for some Internxt recipients');
    this.name = MailErrorName.InternxtRecipientKeyMissing;
  }
}

export class RecipientKeyLookupFailedError extends Error {
  constructor(cause?: unknown) {
    super('Could not look up the recipients public keys');
    this.name = MailErrorName.RecipientKeyLookupFailed;
    this.cause = cause;
  }
}

export class ActiveDomainsUnavailableError extends Error {
  constructor(cause?: unknown) {
    super('Could not fetch the list of active mail domains');
    this.name = MailErrorName.ActiveDomainsUnavailable;
    this.cause = cause;
  }
}

export class ServerPublicKeyMissingError extends Error {
  constructor() {
    super('SERVER_PUBLIC_KEY is not configured');
    this.name = MailErrorName.ServerPublicKeyMissing;
  }
}

export class BlindCopyNotDeliverableError extends Error {
  constructor() {
    super('Blind copy recipients are not deliverable when the email is delivered inside Internxt');
    this.name = MailErrorName.BlindCopyNotDeliverable;
  }
}

export class PrimaryRecipientMissingError extends Error {
  constructor() {
    super('An email needs at least one recipient in the to field');
    this.name = MailErrorName.PrimaryRecipientMissing;
  }
}

export class ForwardedAttachmentUnavailableError extends Error {
  constructor(
    public readonly attachmentName: string,
    cause?: unknown,
  ) {
    super(`Could not take the attachment ${attachmentName} out of the message being forwarded`);
    this.name = MailErrorName.ForwardedAttachmentUnavailable;
    this.cause = cause;
  }
}

export class AttachmentTooLargeError extends Error {
  constructor(public readonly attachmentName: string) {
    super(`The attachment ${attachmentName} is over the size the server accepts`);
    this.name = MailErrorName.AttachmentTooLarge;
  }
}

export class ForwardedAttachmentsNotDecryptableError extends Error {
  constructor() {
    super('The message being forwarded could not be decrypted, so its attachments cannot travel');
    this.name = MailErrorName.ForwardedAttachmentsNotDecryptable;
  }
}

export class AttachmentUploadFailedError extends Error {
  constructor(
    public readonly attachmentName: string,
    cause?: unknown,
  ) {
    super(`Could not upload the attachment ${attachmentName}`);
    this.name = MailErrorName.AttachmentUploadFailed;
    this.cause = cause;
  }
}

/**
 * Reads the HTTP status of a failed request, whether the error is the one the mail SDK threw or one of
 * these errors wrapping it.
 *
 * @param error - The error thrown by a request.
 * @returns The HTTP status, or undefined when the error does not carry one.
 */
export const readHttpStatus = (error: unknown): number | undefined => {
  const requestError = error as { status?: unknown; cause?: { status?: unknown } } | null | undefined;
  const httpStatus = requestError?.status ?? requestError?.cause?.status;
  return typeof httpStatus === 'number' ? httpStatus : undefined;
};
