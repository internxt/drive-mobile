import { EmailResponse, EmailSummaryResponse } from '@internxt/sdk/dist/mail/types';

import { MAILBOX_ORDER, MailboxId } from '../../types/mail';

type RestorableMessage = Pick<EmailSummaryResponse, 'isDraft' | 'from' | 'to'> &
  Partial<Pick<EmailResponse, 'cc' | 'bcc'>>;

export const getRestoreMailbox = (message: RestorableMessage, selfAddress: string): MailboxId => {
  if (message.isDraft) {
    return MailboxId.Drafts;
  }
  const isSelf = (address: string) => address.toLowerCase() === selfAddress.toLowerCase();
  const isSentByTheUser = message.from.some((sender) => isSelf(sender.email));
  const recipients = [...(message.to ?? []), ...(message.cc ?? []), ...(message.bcc ?? [])];
  const isSentToTheUser = recipients.some((recipient) => isSelf(recipient.email));
  return isSentByTheUser && !isSentToTheUser ? MailboxId.Sent : MailboxId.Inbox;
};

/** Returns the mailbox the email is in, or the inbox when it is not known. */
export const resolveResultMailbox = (
  email: Pick<EmailSummaryResponse, 'isDraft' | 'mailboxIds'>,
  mailboxTypeById: Record<string, MailboxId>,
): MailboxId => {
  if (email.isDraft) {
    return MailboxId.Drafts;
  }
  const emailMailboxes = new Set(email.mailboxIds.map((id) => mailboxTypeById[id]));
  return MAILBOX_ORDER.find((mailboxId) => emailMailboxes.has(mailboxId)) ?? MailboxId.Inbox;
};
