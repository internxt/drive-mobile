import { EmailAddress, EmailResponse } from '@internxt/sdk/dist/mail/types';

export type ReplyRecipients = {
  to: EmailAddress[];
  cc: EmailAddress[];
};

export type RepliedMessage = Pick<EmailResponse, 'from' | 'replyTo' | 'to' | 'cc'>;

const addressKey = (address: string): string => address.trim().toLowerCase();

const uniqueAddresses = (addresses: EmailAddress[], excludedAddresses: string[] = []): EmailAddress[] => {
  const seenAddressKeys = new Set(excludedAddresses.map(addressKey));
  const result: EmailAddress[] = [];

  for (const address of addresses) {
    const key = addressKey(address.email);
    if (seenAddressKeys.has(key)) {
      continue;
    }
    seenAddressKeys.add(key);
    result.push(address);
  }

  return result;
};

/**
 * Works out who a reply is addressed to. Must return the same recipients as `deriveReplyRecipients`
 * in `mail-server` (`src/modules/email/threading.ts`), which is what actually addresses the reply:
 * the client seals one wrap of the session key per recipient before the server sees the request, so
 * a recipient this function leaves out receives an envelope they cannot open.
 *
 * @param sourceMail - The message being replied to.
 * @param selfAddress - The address of whoever is replying, kept out of copy.
 * @param replyAll - Whether the other participants of the original go in copy.
 * @returns The recipients of the reply and who travels in copy.
 */
export const deriveReplyRecipients = (
  sourceMail: RepliedMessage,
  selfAddress: string,
  replyAll: boolean,
): ReplyRecipients => {
  const replyTo = sourceMail.replyTo ?? [];
  const from = sourceMail.from ?? [];
  const to = uniqueAddresses(replyTo.length > 0 ? replyTo : from);

  const excludeFromCc = [selfAddress, ...to.map((address) => address.email)];
  const replyAllCc = replyAll ? [...(sourceMail.to ?? []), ...(sourceMail.cc ?? [])] : [];
  const cc = uniqueAddresses(replyAllCc, excludeFromCc);

  return { to, cc };
};
