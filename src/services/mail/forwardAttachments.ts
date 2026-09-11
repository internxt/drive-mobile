import { uint8ArrayToBase64 } from 'internxt-crypto';
import uuid from 'react-native-uuid';

import { ForwardedAttachment, MailAttachment } from '../../types/mail';
import { AcceptedEncodings, fs } from '../FileSystemService';
import { decryptAttachmentData } from './attachmentCrypto';
import { MAX_ATTACHMENT_BYTES } from './attachmentLimits';
import { mailLocalDB } from './database/mailLocalDB';
import {
  AttachmentTooLargeError,
  ForwardedAttachmentUnavailableError,
  ForwardedAttachmentsNotDecryptableError,
} from './errors';
import { mailboxService } from './mailbox.service';

/**
 * An attachment of the message being forwarded, decrypted and written to the device so it can be
 * encrypted again for the new message. The path is kept apart from the uri because the uri is what
 * the upload needs and the path is what deleting the file needs.
 */
export type MaterializedAttachment = {
  attachment: MailAttachment;
  path: string;
};

/**
 * Deletes the files written while materializing attachments. Called both when the forward is sent
 * and when it fails, so a decrypted attachment never outlives the send that needed it.
 *
 * @param materialized - The attachments written to the device so far.
 */
export const discardMaterializedAttachments = async (materialized: MaterializedAttachment[]): Promise<void> => {
  await Promise.all(materialized.map(({ path }) => fs.unlinkIfExists(path)));
};

/**
 * Takes the attachments of a message out of it and leaves them on the device in the clear, so they
 * can be encrypted for the message that forwards them. The server never holds them in a readable
 * form, so there is no way around downloading and decrypting each one.
 *
 * They are fetched one after another on purpose: each one is held whole in memory while it is
 * decrypted and turned into base64, and the server takes them up to 25 MB each.
 *
 * @param params - What to take out of which message.
 * @param params.forwardedMessageId - Id of the message being forwarded.
 * @param params.attachments - Attachments of that message.
 * @param params.areAttachmentsEncrypted - Whether those attachments are encrypted, which is the case
 * for every message that arrived with an envelope.
 * @param params.onAttachmentProgress - Called with the attachment being taken out and how many
 * there are, so a send can be followed.
 * @returns Each attachment as a file on the device.
 * @throws ForwardedAttachmentsNotDecryptableError when the attachments are encrypted and the key of
 * their message is not on this device, so forwarding them would send bytes nobody can open.
 * @throws AttachmentTooLargeError when an attachment is over the size the server accepts.
 * @throws ForwardedAttachmentUnavailableError when an attachment cannot be downloaded, decrypted or
 * written; whatever was written before is deleted first, so nothing is left behind.
 */
export const materializeForwardedAttachments = async ({
  forwardedMessageId,
  attachments,
  areAttachmentsEncrypted,
  onAttachmentProgress,
}: {
  forwardedMessageId: string;
  attachments: ForwardedAttachment[];
  areAttachmentsEncrypted: boolean;
  onAttachmentProgress?: (current: number, total: number) => void;
}): Promise<MaterializedAttachment[]> => {
  const oversized = attachments.find((attachment) => attachment.size > MAX_ATTACHMENT_BYTES);
  if (oversized) {
    throw new AttachmentTooLargeError(oversized.name);
  }

  const attachmentsSessionKey = areAttachmentsEncrypted
    ? (await mailLocalDB.getCachedEmail(forwardedMessageId))?.attachmentsSessionKey
    : null;
  if (areAttachmentsEncrypted && !attachmentsSessionKey) {
    throw new ForwardedAttachmentsNotDecryptableError();
  }

  const materialized: MaterializedAttachment[] = [];

  for (const attachment of attachments) {
    onAttachmentProgress?.(materialized.length + 1, attachments.length);
    try {
      materialized.push(await materializeAttachment(forwardedMessageId, attachment, attachmentsSessionKey));
    } catch (error) {
      await discardMaterializedAttachments(materialized);
      throw new ForwardedAttachmentUnavailableError(attachment.name, error);
    }
  }

  return materialized;
};

const materializeAttachment = async (
  forwardedMessageId: string,
  attachment: ForwardedAttachment,
  attachmentsSessionKey: string | null | undefined,
): Promise<MaterializedAttachment> => {
  const { blobId, name, type, size } = attachment;
  const { data } = await mailboxService.downloadAttachment(forwardedMessageId, blobId, { name, type });

  const bytes = attachmentsSessionKey
    ? await decryptAttachmentData(new Uint8Array(data), attachmentsSessionKey)
    : new Uint8Array(data);

  const path = fs.tmpFilePath(uuid.v4() as string);
  await fs.createFile(path, uint8ArrayToBase64(bytes), AcceptedEncodings.Base64);

  return { attachment: { uri: fs.pathToUri(path), name, type, size }, path };
};
