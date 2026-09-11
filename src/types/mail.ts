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
  /** Id of the message being replied to, which is what keeps the reply in its thread. */
  inReplyTo: string;
  /** Whether the other participants of the original travel in copy. */
  replyAll: boolean;
  /**
   * Whether the server addresses the reply on its own. True while the recipients are the ones that
   * were worked out from the original; false once the user has changed them, and then they travel
   * in the request.
   */
  keepServerDerivedRecipients: boolean;
};

/** What the message detail hands to the compose screen so it opens as a reply. */
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
