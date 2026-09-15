import type { AttachmentRef } from '@internxt/sdk/dist/mail/types';

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

/** An attachment of a message being forwarded, as the original carries it. */
export type ForwardedAttachment = {
  blobId: string;
  name: string;
  type: string;
  size: number;
};

/** The original of a forwarded message, quoted under its own header, as markup. */
export type ForwardedQuote = {
  body: string;
  /**
   * The body of the original as the text it displays, without the header of the quote. It is what
   * the mailbox list shows when whoever forwards the message writes nothing above it.
   */
  originalText: string;
};

export type OutgoingForward = Omit<OutgoingEmail, 'text'> & {
  /** Id of the message being forwarded, which is what keeps the new message in its thread. */
  forwardedMessageId: string;
  /** What the user wrote above the quoted original. */
  note: string;
  /** The original, quoted under its header, which is pasted below the note. */
  quote: ForwardedQuote;
  /** Attachments of the original, which travel with the new message. */
  forwardedAttachments: ForwardedAttachment[];
  /**
   * Whether the attachments of the original are encrypted, which is the case for every message
   * that arrived with an envelope. Forwarding them then needs the key of that message, and fails
   * without it rather than sending bytes nobody can open.
   */
  areAttachmentsEncrypted: boolean;
};

/** How a send reports what it is doing, so the screen can follow it. */
export type SendProgress = {
  onStage?: (stage: SendStage) => void;
};

/**
 * How far along a send is, so the compose screen can say what it is doing.
 */
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

/** What the message detail hands to the compose screen so it opens as a forward. */
export type ForwardComposeParams = {
  forwardedMessageId: string;
  subject: string;
  quote: ForwardedQuote;
  attachments: ForwardedAttachment[];
  areAttachmentsEncrypted: boolean;
  /** Who wrote the original, shown in the compose screen as the origin of the quote. */
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
