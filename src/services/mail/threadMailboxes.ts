import { EmailResponse } from '@internxt/sdk/dist/mail/types';

import { MailboxId } from '../../types/mail';

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
