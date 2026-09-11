export type MailAttachment = {
  uri: string;
  name: string;
  type: string;
  /** Size in bytes, when whoever picked the file reported it. */
  size?: number;
};

export type OutgoingEmail = {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text: string;
  files?: MailAttachment[];
};

export type OutgoingReply = OutgoingEmail & {
  inReplyTo: string;
  replyAll: boolean;
  keepServerDerivedRecipients: boolean;
};

export type ReplyComposeParams = {
  repliedMessageId: string;
  replyAll: boolean;
  subject: string;
  to: string[];
  cc: string[];
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
