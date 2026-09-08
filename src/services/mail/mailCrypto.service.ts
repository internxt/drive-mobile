import { AttachmentRef, DeliveryMode, EmailSummaryResponse, SendEmailRequest } from '@internxt/sdk/dist/mail/types';
import {
  Email,
  KeystoreType,
  base64ToUint8Array,
  decryptEmailHybrid,
  decryptEmailPreviewHybrid,
  decryptSymmetrically,
  encryptEmailHybridForMultipleRecipients,
  encryptSymmetrically,
  genSymmetricKey,
  openEncryptionKeystore,
  uint8ArrayToBase64,
  uint8ToUTF8,
} from 'internxt-crypto';
import strings from '../../../assets/lang/strings';
import { AsyncStorageKey } from '../../types';
import AppService from '../AppService';
import asyncStorageService from '../AsyncStorageService';
import { logger } from '../common/logger/logger.service';
import { AcceptedEncodings, fs } from '../FileSystemService';
import { CachedDecryptedEmail, mailLocalDB } from './database/mailLocalDB';
import {
  ActiveDomainsUnavailableError,
  InternxtRecipientKeyMissingError,
  NoRecipientsError,
  ServerPublicKeyMissingError,
} from './errors';
import { mailboxService } from './mailbox.service';
import { classifyRecipients, isInternxtDomain, uniqueEmailAddresses } from './mailDomain';
import { recipientKeysService } from './recipientKeys.service';

const ENCRYPTED_EMAIL_PREFIX = 'INTERNXT-ENCRYPTED-EMAIL-v1';

export type EmailEncryptionBlock = {
  wrappedKeys: Array<{ encryptedForEmail: string; encryptedKey: string; hybridCiphertext: string }>;
  encryptedPreview: string;
  encryptedText?: string;
  encryptedAttachmentsSessionKey?: string;
  version?: string;
};

export const getPrivateHybridKey = async (mnemonic: string): Promise<Uint8Array> => {
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
};

const findWrappedKeyForEmail = async (encryption: EmailEncryptionBlock) => {
  const myEmail = await asyncStorageService.getItem(AsyncStorageKey.MyMailEmailAdress);
  if (!myEmail) {
    throw new Error('No email adress set for this account');
  }
  const normalized = myEmail.toLowerCase();
  return encryption.wrappedKeys.find((k) => k.encryptedForEmail?.toLowerCase() === normalized);
};

export const isEncryptedEmailBody = (textBody: string | null | undefined): boolean => {
  return !!textBody && textBody.startsWith(`${ENCRYPTED_EMAIL_PREFIX}\n`);
};

export const parseEncryptionBlock = (textBody: string): EmailEncryptionBlock => {
  const payload = textBody.slice(ENCRYPTED_EMAIL_PREFIX.length + 1);
  const json = uint8ToUTF8(base64ToUint8Array(payload));
  return JSON.parse(json);
};

export const decryptPreviews = async (
  emails: EmailSummaryResponse[],
  privateKey: Uint8Array,
): Promise<EmailSummaryResponse[]> => {
  return Promise.all(
    emails.map(async (email) => {
      const encryption = (email as { encryption?: EmailEncryptionBlock }).encryption;
      if (!encryption) {
        return email;
      }
      try {
        const preview = await decryptPreview(encryption, privateKey);
        return { ...email, preview };
      } catch (error) {
        logger.error(`Failed to decrypt preview for email ${email.id}`, error);
        return { ...email, preview: strings.screens.mail.unableToDecryptPreview };
      }
    }),
  );
};

export const decryptPreview = async (encryption: EmailEncryptionBlock, privateKey: Uint8Array): Promise<string> => {
  const wrappedKey = await findWrappedKeyForEmail(encryption);
  if (!wrappedKey) {
    throw new Error('No wrapped key found for recipient');
  }
  const { preview } = await decryptEmailPreviewHybrid(encryption.encryptedPreview, wrappedKey, privateKey);

  return preview;
};

export const decryptAndCacheFullEmail = async (
  emailId: string,
  encryption: EmailEncryptionBlock,
  privateKey: Uint8Array,
): Promise<CachedDecryptedEmail> => {
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
};

export const getCachedEmail = async (emailId: string): Promise<CachedDecryptedEmail | null> => {
  return mailLocalDB.getCachedEmail(emailId);
};

export const removeCachedEmail = async (emailId: string): Promise<void> => {
  await mailLocalDB.deleteCachedEmail(emailId);
};

export const decryptAttachmentData = async (
  data: Uint8Array,
  attachmentsSessionKeyB64: string,
): Promise<Uint8Array> => {
  const key = base64ToUint8Array(attachmentsSessionKeyB64);
  return decryptSymmetrically(key, data);
};

const encryptAttachmentForUpload = async (
  file: { uri: string; name: string; type: string },
  attachmentsSessionKey: Uint8Array,
): Promise<{ uri: string; name: string; type: string }> => {
  const rawBuffer = await fs.readFile(file.uri);
  const encryptedBytes = await encryptSymmetrically(attachmentsSessionKey, new Uint8Array(rawBuffer));
  const encryptedPath = fs.tmpFilePath(`${file.name}.enc`);
  await fs.unlinkIfExists(encryptedPath);
  await fs.createFile(encryptedPath, uint8ArrayToBase64(encryptedBytes), AcceptedEncodings.Base64);

  return { uri: fs.pathToUri(encryptedPath), name: file.name, type: file.type };
};

/**
 * Gets the domains the server treats as internal.
 *
 * @returns The active domains.
 * @throws ActiveDomainsUnavailableError when the server cannot be reached.
 */
const getActiveDomains = async (): Promise<{ domain: string }[]> => {
  let activeDomains: { domain: string }[];
  try {
    activeDomains = await mailboxService.getActiveDomains();
  } catch (error) {
    throw new ActiveDomainsUnavailableError(error);
  }

  if (activeDomains.length === 0) {
    throw new ActiveDomainsUnavailableError(new Error('The server reported no active domains'));
  }

  return activeDomains;
};

/**
 * Resolves the public key each recipient's wrap of the session key must be built with.
 *
 * Every recipient gets a wrap: their own key when the server publishes one, the server key
 * when they are external so `mail-server` can decrypt and deliver over SMTP. A recipient on
 * an active domain with no published key aborts the send instead of receiving something
 * nobody can open.
 *
 * @param addresses - Normalized, deduplicated recipient addresses.
 * @param activeDomains - Domains the server treats as internal.
 * @param serverPublicKey - Key the external recipients are wrapped with; may be empty when unconfigured.
 * @returns One address/key pair per recipient.
 * @throws InternxtRecipientKeyMissingError when an internal recipient has no published key.
 * @throws ServerPublicKeyMissingError when an external recipient needs the server key and it is unset.
 */
const resolveWrapKeys = async (
  addresses: string[],
  activeDomains: { domain: string }[],
  serverPublicKey: string,
): Promise<{ address: string; publicKey: string }[]> => {
  const recipientKeys = await recipientKeysService.getPublicKeys(addresses);

  const missingInternxtKeys = recipientKeys
    .filter((recipient) => !recipient.publicKey && isInternxtDomain(recipient.address, activeDomains))
    .map((recipient) => recipient.address);
  if (missingInternxtKeys.length > 0) {
    throw new InternxtRecipientKeyMissingError(missingInternxtKeys);
  }

  const addressesWithoutKey = recipientKeys
    .filter((recipient) => !recipient.publicKey)
    .map((recipient) => recipient.address);
  if (addressesWithoutKey.length > 0 && !serverPublicKey) {
    throw new ServerPublicKeyMissingError();
  }
  if (addressesWithoutKey.length > 0) {
    logger.info(`Wrapping with the server key for: ${addressesWithoutKey.join(', ')}`);
  }

  return recipientKeys.map((recipient) => ({
    address: recipient.address,
    publicKey: recipient.publicKey ?? serverPublicKey,
  }));
};

/**
 * Encrypts an email and sends it, giving every recipient their own wrap of the session key.
 *
 * @param to - Recipient addresses as typed by the user; duplicates and casing are normalized.
 * @param subject - Subject line, which travels in cleartext because the server indexes it.
 * @param text - Body of the message.
 * @param files - Attachments to encrypt and upload before sending.
 * @throws NoRecipientsError when there is nobody to send the message to.
 */
export const encryptAndSendEmail = async (
  to: string[],
  subject: string,
  text: string,
  files: { uri: string; name: string; type: string }[] = [],
): Promise<void> => {
  const addresses = uniqueEmailAddresses(to);
  if (addresses.length === 0) {
    throw new NoRecipientsError();
  }

  const activeDomains = await getActiveDomains();

  const [wrapKeys, senderKeys] = await Promise.all([
    resolveWrapKeys(addresses, activeDomains, AppService.constants.SERVER_PUBLIC_KEY),
    mailboxService.getMailAccountKeys(),
  ]);

  const senderAddress = senderKeys.address.trim().toLowerCase();
  const wrapKeysWithoutSender = wrapKeys.filter((wrapKey) => wrapKey.address !== senderAddress);
  const recipients = [...wrapKeysWithoutSender, { address: senderAddress, publicKey: senderKeys.publicKey }].map(
    (recipient) => ({
      email: recipient.address,
      publicHybridKey: base64ToUint8Array(recipient.publicKey),
    }),
  );

  const attachmentsSessionKey = genSymmetricKey();
  let uploadedAttachments: AttachmentRef[] = [];
  if (files.length > 0) {
    uploadedAttachments = await Promise.all(
      files.map(async (file) => {
        const encryptedFile = await encryptAttachmentForUpload(file, attachmentsSessionKey);
        const result = await mailboxService.uploadAttachment(encryptedFile);
        return { blobId: result.blobId, name: result.name, type: result.type, size: result.size };
      }),
    );
  }
  const email: Email = {
    text,
    preview: text.slice(0, 256),
    attachmentsSessionKey,
  };

  const { encryptedKeys, encEmail } = await encryptEmailHybridForMultipleRecipients(email, recipients);

  const deliveryMode: DeliveryMode = classifyRecipients(addresses, activeDomains).allInternxt ? 'INTERNXT' : 'EXTERNAL';

  const body: SendEmailRequest = {
    to: addresses.map((email) => ({ email })),
    subject,
    deliveryMode,
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
};

export const moveThreadToMailbox = async (threadMessageIds: string[], mailbox: 'trash' | 'spam'): Promise<void> => {
  await Promise.all(threadMessageIds.map((id) => mailboxService.updateEmail(id, { mailbox })));
};

export const markEmailUnread = async (emailId: string): Promise<void> => {
  await mailboxService.updateEmail(emailId, { isRead: false });
};

export const markEmailRead = async (emailId: string): Promise<void> => {
  await mailboxService.updateEmail(emailId, { isRead: true });
};
