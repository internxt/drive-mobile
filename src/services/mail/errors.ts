export const MailErrorName = {
  NoRecipients: 'NoRecipientsError',
  InternxtRecipientKeyMissing: 'InternxtRecipientKeyMissingError',
  RecipientKeyLookupFailed: 'RecipientKeyLookupFailedError',
  ActiveDomainsUnavailable: 'ActiveDomainsUnavailableError',
  ServerPublicKeyMissing: 'ServerPublicKeyMissingError',
  BlindCopyNotDeliverable: 'BlindCopyNotDeliverableError',
  PrimaryRecipientMissing: 'PrimaryRecipientMissingError',
} as const;

export class NoRecipientsError extends Error {
  constructor() {
    super('An email needs at least one recipient');
    this.name = MailErrorName.NoRecipients;
  }
}

export class InternxtRecipientKeyMissingError extends Error {
  constructor(public readonly addresses: string[]) {
    super(`No published key for Internxt recipients: ${addresses.join(', ')}`);
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
