export type MailAttachment = {
  uri: string;
  name: string;
  type: string;
};

export type OutgoingEmail = {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text: string;
  files?: MailAttachment[];
};

export enum MailboxId {
  Inbox = 'inbox',
  Drafts = 'drafts',
  Sent = 'sent',
  Spam = 'spam',
  Trash = 'trash',
}

export const MAILBOX_ORDER: MailboxId[] = [
  MailboxId.Inbox,
  MailboxId.Sent,
  MailboxId.Drafts,
  MailboxId.Spam,
  MailboxId.Trash,
];

export const MAILBOXES_WITH_UNREAD_BADGE = new Set<MailboxId>([MailboxId.Inbox, MailboxId.Spam, MailboxId.Trash]);
