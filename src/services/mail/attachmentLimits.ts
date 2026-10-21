import prettysize from 'prettysize';

/**
 * What the mail server accepts in a single attachment upload. It constrains every outgoing
 * attachment, whichever message carries it.
 */
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

/** What encrypting an attachment adds to its size: the nonce and the authentication tag. */
export const ENCRYPTED_ATTACHMENT_OVERHEAD_BYTES = 28;

/**
 * Tells whether an attachment is over the size the server accepts once it is encrypted.
 *
 * @param attachment - The attachment.
 * @param attachment.size - Its size in bytes before encrypting it, when known.
 * @returns Whether it is known to be too large; an attachment of unknown size is not.
 */
export const isAttachmentTooLarge = ({ size }: { size?: number }): boolean =>
  size !== undefined && size + ENCRYPTED_ATTACHMENT_OVERHEAD_BYTES > MAX_ATTACHMENT_BYTES;

/**
 * Writes the size the server accepts for an attachment the way it is shown to the user.
 *
 * @returns The size, with its unit.
 */
export const formatMaxAttachmentSize = (): string => prettysize(MAX_ATTACHMENT_BYTES, true);
