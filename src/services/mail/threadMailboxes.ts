import { EmailResponse, EmailSummaryResponse } from '@internxt/sdk/dist/mail/types';

import { MAILBOX_ORDER, MailboxId } from '../../types/mail';

export const filterMessagesInMailbox = <Message extends Pick<EmailResponse, 'mailboxIds'>>(
  messages: Message[],
  mailboxId: MailboxId,
  mailboxTypeById: Record<string, MailboxId>,
): Message[] => messages.filter((message) => message.mailboxIds.some((id) => mailboxTypeById[id] === mailboxId));

export const getRestoreMailbox = (message: Pick<EmailResponse, 'isDraft' | 'from'>, selfAddress: string): MailboxId => {
  if (message.isDraft) {
    return MailboxId.Drafts;
  }
  const isSentByTheUser = message.from.some((sender) => sender.email.toLowerCase() === selfAddress.toLowerCase());
  return isSentByTheUser ? MailboxId.Sent : MailboxId.Inbox;
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
