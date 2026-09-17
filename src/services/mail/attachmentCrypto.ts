import { base64ToUint8Array, decryptSymmetrically } from 'internxt-crypto';

export const decryptAttachmentData = async (
  data: Uint8Array,
  attachmentsSessionKeyB64: string,
): Promise<Uint8Array> => {
  const key = base64ToUint8Array(attachmentsSessionKeyB64);
  return decryptSymmetrically(key, data);
};
