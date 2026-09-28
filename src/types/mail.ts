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
  uploadedAttachments?: UploadedAttachments;
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

export type UploadedAttachments = {
  attachmentsSessionKey: string;
  attachments: AttachmentRef[];
};

export type DraftContent = {
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
  draftAttachments: UploadedAttachments | null;
};

export type OutgoingNewEmail = OutgoingEmail & {
  draftId?: string;
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
