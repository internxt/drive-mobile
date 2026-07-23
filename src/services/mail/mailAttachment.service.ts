import { uint8ArrayToBase64 } from 'internxt-crypto';
import { AcceptedEncodings, fs } from '../FileSystemService';
import { decryptAttachmentData } from './mailCrypto.service';
import { mailboxService } from './mailbox.service';

export type AttachmentToOpen = {
  emailId: string;
  blobId: string;
  name: string;
  type: string;
  attachmentsSessionKey: string | null;
};

export async function downloadDecryptAndOpenAttachment({
  emailId,
  blobId,
  name,
  type,
  attachmentsSessionKey,
}: AttachmentToOpen): Promise<void> {
  const { data, contentType } = await mailboxService.downloadAttachment(emailId, blobId, { name, type });

  const bytes = attachmentsSessionKey
    ? await decryptAttachmentData(new Uint8Array(data), attachmentsSessionKey)
    : new Uint8Array(data);

  const base64Content = uint8ArrayToBase64(bytes);
  const path = fs.tmpFilePath(name);
  await fs.unlinkIfExists(path);
  await fs.createFile(path, base64Content, AcceptedEncodings.Base64);

  await fs.showFileViewer(fs.pathToUri(path), { showTitle: true, type: contentType || type });
}
