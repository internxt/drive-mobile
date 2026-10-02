import { uint8ArrayToBase64 } from 'internxt-crypto';
import { AcceptedEncodings, fs } from '../FileSystemService';
import { decryptAttachmentData } from './attachmentCrypto';
import { mailboxService } from './mailbox.service';

export type AttachmentToOpen = {
  emailId: string;
  blobId: string;
  name: string;
  type: string;
  attachmentsSessionKey: string | null;
};

const toPathSegment = (value: string): string => value.replace(/[/\\]/g, '_');

const getOpenedAttachmentsDir = (): string => `${fs.getCacheDir()}/mail_attachments/`;

const openedAttachmentDirFor = (emailId: string, blobId: string): string =>
  `${getOpenedAttachmentsDir()}${toPathSegment(emailId)}/${toPathSegment(blobId)}/`;

export const downloadDecryptAndOpenAttachment = async ({
  emailId,
  blobId,
  name,
  type,
  attachmentsSessionKey,
}: AttachmentToOpen): Promise<void> => {
  const attachmentDir = openedAttachmentDirFor(emailId, blobId);
  const cachedPath = attachmentDir + toPathSegment(name);

  if (!(await fs.exists(cachedPath))) {
    const { data } = await mailboxService.downloadAttachment(emailId, blobId, { name, type });

    const bytes = attachmentsSessionKey
      ? await decryptAttachmentData(new Uint8Array(data), attachmentsSessionKey)
      : new Uint8Array(data);

    const temporaryPath = fs.tmpFilePath();
    try {
      await fs.createFile(temporaryPath, uint8ArrayToBase64(bytes), AcceptedEncodings.Base64);
      await fs.ensureDir(attachmentDir);
      await fs.moveFile(temporaryPath, cachedPath);
    } finally {
      await fs.unlinkIfExists(temporaryPath);
    }
  }

  await fs.showFileViewer(fs.pathToUri(cachedPath), { showTitle: true, type });
};

export const clearOpenedAttachments = async (): Promise<void> => {
  await fs.unlinkIfExists(getOpenedAttachmentsDir());
};
