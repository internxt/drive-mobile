import {
  KeystoreType,
  base64ToUint8Array,
  openEncryptionKeystore,
  uint8ArrayToBase64,
  decryptSymmetrically,
  encryptSymmetrically,
  genSymmetricKey,
} from 'internxt-crypto';
import {
  decryptEmailHybrid,
  decryptEmailPreviewHybrid,
  encryptEmailHybridForMultipleRecipients,
  Email,
} from 'internxt-crypto';
import { Buffer } from 'buffer';
import asyncStorageService from '../AsyncStorageService';
import { AsyncStorageKey } from '../../types';
import { CachedDecryptedEmail, mailLocalDB } from './database/mailLocalDB';
import { mailboxService } from './mailbox.service';
import { EmailSummaryResponse, AttachmentRef, SendEmailRequest } from '@internxt/sdk/dist/mail/types';
import { AcceptedEncodings, fs } from '../FileSystemService';

const ENCRYPTED_EMAIL_PREFIX = 'INTERNXT-ENCRYPTED-EMAIL-v1';

export type EmailEncryptionBlock = {
  wrappedKeys: Array<{ encryptedForEmail: string; encryptedKey: string; hybridCiphertext: string }>;
  encryptedPreview: string;
  encryptedText?: string;
  encryptedAttachmentsSessionKey?: string;
  version?: string;
};

/**
 * Gets the user's private hybrid key and persists it via SecureStore
 *
 * @param mnemonic - The user's decrypted mnemonic
 * @param userEmail - The user's own mail address (used as EncryptedKeystore.userEmail)
 */
export async function getPrivateHybridKey(mnemonic: string): Promise<Uint8Array> {
  const stored = await asyncStorageService.getItem(AsyncStorageKey.MailAccountPrivateKey);
  if (stored) {
    return base64ToUint8Array(stored);
  }

  const keys = await mailboxService.getMailAccountKeys();
  const keystore = {
    userEmail: keys.address,
    type: KeystoreType.ENCRYPTION,
    publicKey: keys.publicKey,
    privateKeyEncrypted: keys.encryptionPrivateKey,
  };
  const { secretKey } = await openEncryptionKeystore(keystore, mnemonic);

  await asyncStorageService.saveItem(AsyncStorageKey.MailAccountPrivateKey, uint8ArrayToBase64(secretKey));
  await asyncStorageService.saveItem(AsyncStorageKey.MyMailEmailAdress, keys.address);
  return secretKey;
}

async function findWrappedKeyForEmail(encryption: EmailEncryptionBlock) {
  const myEmail = await asyncStorageService.getItem(AsyncStorageKey.MyMailEmailAdress);
  if (!myEmail) {
    throw new Error('No email adress set for this account');
  }
  const normalized = myEmail.toLowerCase();
  return encryption.wrappedKeys.find((k) => k.encryptedForEmail?.toLowerCase() === normalized);
}

/** True if a thread message's textBody is actually an encrypted email envelope, not plain text. */
export function isEncryptedEmailBody(textBody: string | null | undefined): boolean {
  return !!textBody && textBody.startsWith(`${ENCRYPTED_EMAIL_PREFIX}\n`);
}

/** Parses the encryption block embedded in a thread message's textBody. */
export function parseEncryptionBlock(textBody: string): EmailEncryptionBlock {
  const payload = textBody.slice(ENCRYPTED_EMAIL_PREFIX.length + 1);
  const json = Buffer.from(payload, 'base64').toString('utf-8');
  return JSON.parse(json);
}
/**
 * Decrypts the preview for each enchrypted email
 */
export async function decryptPreviews(
  emails: EmailSummaryResponse[],
  privateKey: Uint8Array,
): Promise<EmailSummaryResponse[]> {
  return Promise.all(
    emails.map(async (email) => {
      const encryption = (email as { encryption?: EmailEncryptionBlock }).encryption;
      if (!encryption) return email;
      try {
        const preview = await decryptPreview(encryption, privateKey);
        return { ...email, preview };
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(`Failed to decrypt preview for email ${email.id}`, error);
        return { ...email, preview: '[Unable to decrypt preview]' };
      }
    }),
  );
}

/**
 * Decrypts just the preview for a LIST-view email
 *
 * @param encryption - The email's encryption block from the list response
 * @param privateKey - The user's private hybrid key (see getPrivateHybridKey)
 */
export async function decryptPreview(encryption: EmailEncryptionBlock, privateKey: Uint8Array): Promise<string> {
  const wrappedKey = await findWrappedKeyForEmail(encryption);
  if (!wrappedKey) {
    throw new Error('No wrapped key found for recipient');
  }
  const { preview } = await decryptEmailPreviewHybrid(encryption.encryptedPreview, wrappedKey, privateKey);

  return preview;
}

/**
 * Decrypts the full body for an email
 *
 * @param emailId - The email's id, used as the SQLite cache key
 * @param encryption - The full encryption block parsed from the thread message's textBody
 * @param privateKey - The user's private hybrid key (see getPrivateHybridKey)
 */
export async function decryptAndCacheFullEmail(
  emailId: string,
  encryption: EmailEncryptionBlock,
  privateKey: Uint8Array,
): Promise<CachedDecryptedEmail> {
  if (!encryption.encryptedText || !encryption.encryptedAttachmentsSessionKey) {
    throw new Error(`Encryption block for email ${emailId} is missing full-body fields`);
  }

  const wrappedKey = await findWrappedKeyForEmail(encryption);
  if (!wrappedKey) {
    throw new Error('No wrapped key found for recipient');
  }
  if (encryption.version === 'v1' || encryption.version === 'v2') {
    throw new Error('Legacy version, not supported');
  }

  const { text, attachmentsSessionKey } = await decryptEmailHybrid(
    {
      encText: encryption.encryptedText,
      encPreview: encryption.encryptedPreview,
      encAttachmentsSessionKey: encryption.encryptedAttachmentsSessionKey,
    },
    wrappedKey,
    privateKey,
  );

  const decrypted: CachedDecryptedEmail = {
    text,
    attachmentsSessionKey: uint8ArrayToBase64(attachmentsSessionKey),
  };

  await mailLocalDB.saveCachedEmail(emailId, decrypted);
  return decrypted;
}

/** Gets a previously cached fully-decrypted email from SQLite, if any. */
export async function getCachedEmail(emailId: string): Promise<CachedDecryptedEmail | null> {
  return mailLocalDB.getCachedEmail(emailId);
}

/** Removes cached data for a deleted email. */
export async function removeCachedEmail(emailId: string): Promise<void> {
  await mailLocalDB.deleteCachedEmail(emailId);
}

export async function decryptAttachmentData(data: Uint8Array, attachmentsSessionKeyB64: string): Promise<Uint8Array> {
  const key = base64ToUint8Array(attachmentsSessionKeyB64);
  return decryptSymmetrically(key, data);
}

async function encryptAttachmentForUpload(
  file: { uri: string; name: string; type: string },
  attachmentsSessionKey: Uint8Array,
): Promise<{ uri: string; name: string; type: string }> {
  const rawBuffer = await fs.readFile(file.uri);
  const encryptedBytes = await encryptSymmetrically(attachmentsSessionKey, new Uint8Array(rawBuffer));
  const encryptedPath = fs.tmpFilePath(`${file.name}.enc`);
  await fs.unlinkIfExists(encryptedPath);
  await fs.createFile(encryptedPath, uint8ArrayToBase64(encryptedBytes), AcceptedEncodings.Base64);

  return { uri: fs.pathToUri(encryptedPath), name: file.name, type: file.type };
}

export async function encryptAndSendEmail(
  to: string[],
  subject: string,
  text: string,
  files: { uri: string; name: string; type: string }[] = [],
): Promise<void> {
  const looked_up = await mailboxService.getRecipientsWithPublicKeys(to);
  const recipients = looked_up.recipients
    .filter((r) => r.publicKey !== null)
    .map((r) => ({
      email: r.address,
      publicHybridKey: base64ToUint8Array(r.publicKey as string),
    }));

  const attachmentsSessionKey = genSymmetricKey();
  let uploadedAttachments: AttachmentRef[] = [];
  if (files.length > 0) {
    uploadedAttachments = await Promise.all(
      files.map(async (file) => {
        const encryptedFile = await encryptAttachmentForUpload(file, attachmentsSessionKey as Uint8Array);
        const result = await mailboxService.uploadAttachment(encryptedFile);
        return { blobId: result.blobId, name: result.name, type: result.type, size: result.size };
      }),
    );
  }
  const email: Email = {
    text,
    preview: text.slice(0, 256),
    attachmentsSessionKey: attachmentsSessionKey ?? new Uint8Array(),
  };

  const { encryptedKeys, encEmail } = await encryptEmailHybridForMultipleRecipients(email, recipients);

  const body: SendEmailRequest = {
    to: to.map((email) => ({ email })),
    subject,
    encryption: {
      version: 'v3',
      encryptedText: encEmail.encText,
      encryptedPreview: encEmail.encPreview,
      encryptedAttachmentsSessionKey: encEmail.encAttachmentsSessionKey,
      wrappedKeys: encryptedKeys,
    },
    ...(uploadedAttachments.length > 0 ? { attachments: uploadedAttachments } : {}),
  };

  await mailboxService.sendEmail(body);
}

export async function sendEmail(
  to: string[],
  subject: string,
  text: string,
  files: { uri: string; name: string; type: string }[] = [],
): Promise<void> {
  const uploadedAttachments: AttachmentRef[] = await Promise.all(
    files.map(async (file) => {
      const result = await mailboxService.uploadAttachment(file);
      return { blobId: result.blobId, name: result.name, type: result.type, size: result.size };
    }),
  );

  const body: SendEmailRequest = {
    to: to.map((email) => ({ email })),
    subject,
    textBody: text,
    ...(uploadedAttachments.length > 0 ? { attachments: uploadedAttachments } : {}),
  };

  await mailboxService.sendEmail(body);
}
