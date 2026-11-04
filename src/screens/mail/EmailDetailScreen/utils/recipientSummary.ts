import { EmailResponse } from '@internxt/sdk/dist/mail/types';

import { normalizeAddress } from '../../../../services/mail/mailDomain';

export type RecipientSummary = {
  isSelfIncluded: boolean;
  firstRecipientLabel: string;
  otherRecipientCount: number;
};

/** Sums up who a message went to, across To, Cc and Bcc, or returns `null` when it has no recipients. */
export const summarizeRecipients = (message: EmailResponse, selfAddress: string): RecipientSummary | null => {
  const recipients = [...(message.to ?? []), ...(message.cc ?? []), ...(message.bcc ?? [])];
  if (recipients.length === 0) {
    return null;
  }

  const normalizedSelfAddress = normalizeAddress(selfAddress);
  const isSelfIncluded =
    !!normalizedSelfAddress && recipients.some(({ email }) => normalizeAddress(email) === normalizedSelfAddress);
  const firstRecipient = recipients[0];

  return {
    isSelfIncluded,
    firstRecipientLabel: firstRecipient.name?.trim() || firstRecipient.email,
    otherRecipientCount: recipients.length - 1,
  };
};
