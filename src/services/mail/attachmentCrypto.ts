import { base64ToUint8Array, decryptSymmetrically } from 'internxt-crypto';

/**
 * Decrypts the bytes of an attachment. Every attachment of a message is encrypted with the same
 * key, which travels inside the envelope of that message.
 *
 * @param data - The attachment as it was downloaded.
 * @param attachmentsSessionKeyB64 - Key the attachments of its message are encrypted with.
 * @returns The attachment in the clear.
 */
export const decryptAttachmentData = async (
  data: Uint8Array,
  attachmentsSessionKeyB64: string,
): Promise<Uint8Array> => {
  const key = base64ToUint8Array(attachmentsSessionKeyB64);
  return decryptSymmetrically(key, data);
};
