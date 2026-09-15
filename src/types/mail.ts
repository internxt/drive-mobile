import type { AttachmentRef } from '@internxt/sdk/dist/mail/types';

export type MailAttachment = {
  uri: string;
  name: string;
  type: string;
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

export type ForwardedAttachment = {
  blobId: string;
  name: string;
  type: string;
  size: number;
};

export type ForwardedQuote = {
  body: string;
  originalText: string;
};

export type OutgoingForward = Omit<OutgoingEmail, 'text'> & {
  forwardedMessageId: string;
  note: string;
  quote: ForwardedQuote;
  forwardedAttachments: ForwardedAttachment[];
  areAttachmentsEncrypted: boolean;
};

export type SendProgress = {
  onStage?: (stage: SendStage) => void;
};

export type SendStage =
  | { name: 'downloadingAttachments'; current: number; total: number }
  | { name: 'uploadingAttachments'; current: number; total: number }
  | { name: 'sending' };

/** Attachments a draft already carries, uploaded and encrypted with the key of that draft, in base64. */
export type DraftAttachments = {
  attachmentsSessionKey: string;
  attachments: AttachmentRef[];
};

/** What the draft of a message holds: its recipients, subject, body as typed, and the attachments it carries. */
export type DraftContent = {
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
  draftAttachments: DraftAttachments | null;
};

export type OutgoingNewEmail = OutgoingEmail & {
  /** Id of the draft the message was written in, which the server destroys once the message is sent. */
  draftId?: string;
  /** Attachments the draft already carries, which travel without being uploaded again. */
  draftAttachments?: DraftAttachments;
};

/** What the message detail hands to the compose screen so it opens as a reply. */
export type ReplyComposeParams = {
  repliedMessageId: string;
  replyAll: boolean;
  subject: string;
  to: string[];
  cc: string[];
};

export type ForwardComposeParams = {
  forwardedMessageId: string;
  subject: string;
  quote: ForwardedQuote;
  attachments: ForwardedAttachment[];
  areAttachmentsEncrypted: boolean;
  originalSender: string;
};

/** What the mailbox list hands to the compose screen so it opens a draft. */
export type DraftComposeParams = {
  draftId: string;
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
