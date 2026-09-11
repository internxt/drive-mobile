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
import { MailAttachment, OutgoingEmail, OutgoingReply } from '../../types/mail';
import AppService from '../AppService';
import asyncStorageService from '../AsyncStorageService';
import { logger } from '../common/logger/logger.service';
import { AcceptedEncodings, fs } from '../FileSystemService';
import { CachedDecryptedEmail, mailLocalDB } from './database/mailLocalDB';
import {
  ActiveDomainsUnavailableError,
  BlindCopyNotDeliverableError,
  InternxtRecipientKeyMissingError,
  NoRecipientsError,
  PrimaryRecipientMissingError,
  ServerPublicKeyMissingError,
} from './errors';
import { mailboxService } from './mailbox.service';
import { classifyRecipients, isInternxtDomain, uniqueEmailAddresses } from './mailDomain';
import { recipientKeysService } from './recipientKeys.service';

const ENCRYPTED_EMAIL_PREFIX = 'INTERNXT-ENCRYPTED-EMAIL-v1';
const PREVIEW_LENGTH = 256;

/** A domain the mail server treats as internal. */
type ActiveDomain = { domain: string };

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
  file: MailAttachment,
  attachmentsSessionKey: Uint8Array,
): Promise<MailAttachment> => {
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
const getActiveDomains = async (): Promise<ActiveDomain[]> => {
  let activeDomains: ActiveDomain[];
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
    logger.info(`Wrapping with the server key for ${addressesWithoutKey.length} recipients`);
  }

  return recipientKeys.map((recipient) => ({
    address: recipient.address,
    publicKey: recipient.publicKey ?? serverPublicKey,
  }));
};

type NormalizedRecipients = {
  toAddresses: string[];
  ccAddresses: string[];
  bccAddresses: string[];
  allAddresses: string[];
};

type EncryptedMessagePayload = {
  encryption: NonNullable<SendEmailRequest['encryption']>;
  attachments: AttachmentRef[];
};

/**
 * Puts the recipients of a message in the shape the rest of the send needs: without duplicates,
 * without anyone appearing in more than one field, and with the whole audience in one list.
 *
 * @param recipients - Recipient addresses as typed by the user.
 * @param recipients.to - Primary recipients.
 * @param recipients.cc - Addresses in copy.
 * @param recipients.bcc - Addresses in blind copy.
 * @returns Each field normalized, plus every address of the message in a single list.
 * @throws NoRecipientsError when there is nobody to send the message to.
 * @throws PrimaryRecipientMissingError when everybody is in copy; the server needs at least one
 * recipient in `to`.
 */
export const normalizeRecipients = ({
  to,
  cc = [],
  bcc = [],
}: Pick<OutgoingEmail, 'to' | 'cc' | 'bcc'>): NormalizedRecipients => {
  const toAddresses = uniqueEmailAddresses(to);
  const ccAddresses = uniqueEmailAddresses(cc).filter((address) => !toAddresses.includes(address));
  const bccAddresses = uniqueEmailAddresses(bcc).filter(
    (address) => !toAddresses.includes(address) && !ccAddresses.includes(address),
  );
  const allAddresses = [...toAddresses, ...ccAddresses, ...bccAddresses];

  if (allAddresses.length === 0) {
    throw new NoRecipientsError();
  }
  if (toAddresses.length === 0) {
    throw new PrimaryRecipientMissingError();
  }

  return { toAddresses, ccAddresses, bccAddresses, allAddresses };
};

/**
 * Encrypts a message for everyone who has to read it and uploads its attachments, giving every
 * recipient their own wrap of the session key and the sender one of their own, so the message stays
 * readable in the Sent folder.
 *
 * @param email - The message to encrypt.
 * @param email.allAddresses - Every address of the message, in any field.
 * @param email.activeDomains - Domains the mail server serves, used to tell internal recipients apart.
 * @param email.text - Body of the message.
 * @param email.preview - Opening of the body, shown in the mailbox list before the message is read.
 * @param email.files - Attachments to encrypt and upload.
 * @returns The encrypted envelope of the message and its uploaded attachments.
 * @throws InternxtRecipientKeyMissingError when an internal recipient publishes no key.
 * @throws ServerPublicKeyMissingError when an external recipient has nobody to wrap their copy with.
 */
export const encryptMessageForRecipients = async ({
  allAddresses,
  activeDomains,
  text,
  preview,
  files = [],
}: {
  allAddresses: string[];
  activeDomains: ActiveDomain[];
  text: string;
  preview: string;
  files?: MailAttachment[];
}): Promise<EncryptedMessagePayload> => {
  const [wrapKeys, senderKeys] = await Promise.all([
    resolveWrapKeys(allAddresses, activeDomains, AppService.constants.SERVER_PUBLIC_KEY),
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

  const email: Email = { text, preview, attachmentsSessionKey };
  const { encryptedKeys, encEmail } = await encryptEmailHybridForMultipleRecipients(email, recipients);

  return {
    encryption: {
      version: 'v3',
      encryptedText: encEmail.encText,
      encryptedPreview: encEmail.encPreview,
      encryptedAttachmentsSessionKey: encEmail.encAttachmentsSessionKey,
      wrappedKeys: encryptedKeys,
    },
    attachments: uploadedAttachments,
  };
};

/**
 * Works out how a message has to be delivered. Runs before the envelope is built, because it is
 * what decides whether the message can be sent at all, and nothing may reach the server until then.
 *
 * @param allAddresses - Every address of the message, in any field.
 * @returns How the message travels, and the domains that decided it, so they are fetched once.
 * @throws ActiveDomainsUnavailableError when the list of internal domains cannot be retrieved.
 */
const resolveDelivery = async (
  allAddresses: string[],
): Promise<{ deliveryMode: DeliveryMode; activeDomains: ActiveDomain[] }> => {
  const activeDomains = await getActiveDomains();
  const deliveryMode: DeliveryMode = classifyRecipients(allAddresses, activeDomains).allInternxt
    ? 'INTERNXT'
    : 'EXTERNAL';

  return { deliveryMode, activeDomains };
};

/**
 * Blind copy is only deliverable when the message leaves Internxt. Under internal delivery every
 * recipient reads the same envelope, and that envelope names them all.
 *
 * @param deliveryMode - How the message is going to be delivered.
 * @param bccAddresses - Addresses in blind copy.
 * @throws BlindCopyNotDeliverableError when a message delivered inside Internxt has blind copy
 * recipients.
 */
const assertBlindCopyIsDeliverable = (deliveryMode: DeliveryMode, bccAddresses: string[]): void => {
  if (deliveryMode === 'INTERNXT' && bccAddresses.length > 0) {
    throw new BlindCopyNotDeliverableError();
  }
};

const previewOf = (text: string): string => text.slice(0, PREVIEW_LENGTH);

const toEmailAddresses = (addresses: string[]) => addresses.map((email) => ({ email }));

/**
 * Encrypts an email and sends it, giving every recipient their own wrap of the session key.
 *
 * @param email - The message to send.
 * @param email.to - Recipient addresses as typed by the user; duplicates and casing are normalized.
 * @param email.cc - Addresses in copy, normalized like `to`.
 * @param email.bcc - Addresses in blind copy, normalized like `to`.
 * @param email.subject - Subject line, which travels in cleartext because the server indexes it.
 * @param email.text - Body of the message.
 * @param email.files - Attachments to encrypt and upload before sending.
 * @throws NoRecipientsError when there is nobody to send the message to.
 * @throws PrimaryRecipientMissingError when everybody is in copy; the server needs at least one
 * recipient in `to`.
 * @throws BlindCopyNotDeliverableError when the email is delivered inside Internxt and has blind
 * copy recipients: every recipient reads the same envelope, and the envelope names them all.
 */
export const encryptAndSendEmail = async ({ to, cc, bcc, subject, text, files }: OutgoingEmail): Promise<void> => {
  const { toAddresses, ccAddresses, bccAddresses, allAddresses } = normalizeRecipients({ to, cc, bcc });
  const { deliveryMode, activeDomains } = await resolveDelivery(allAddresses);
  assertBlindCopyIsDeliverable(deliveryMode, bccAddresses);

  const { encryption, attachments } = await encryptMessageForRecipients({
    allAddresses,
    activeDomains,
    text,
    preview: previewOf(text),
    files,
  });

  await mailboxService.sendEmail({
    to: toEmailAddresses(toAddresses),
    ...(ccAddresses.length > 0 ? { cc: toEmailAddresses(ccAddresses) } : {}),
    ...(bccAddresses.length > 0 ? { bcc: toEmailAddresses(bccAddresses) } : {}),
    subject,
    deliveryMode,
    encryption,
    ...(attachments.length > 0 ? { attachments } : {}),
  });
};

/**
 * Encrypts a reply and sends it, keeping it in the thread of the message being answered.
 *
 * The recipients still travel through the encryption, because the envelope is sealed with one wrap
 * per recipient before the server sees the request. They only travel in the request itself once the
 * user has changed them: while they are the ones worked out from the original, the server addresses
 * the reply, exactly as `mail-web` does.
 *
 * @param reply - The reply to send.
 * @param reply.inReplyTo - Id of the message being replied to.
 * @param reply.replyAll - Whether the other participants of the original travel in copy.
 * @param reply.keepServerDerivedRecipients - Whether the server addresses the reply on its own.
 * @param reply.to - Recipients of the reply, worked out from the original or edited by the user.
 * @param reply.cc - Addresses in copy, normalized like `to`.
 * @param reply.bcc - Addresses in blind copy, normalized like `to`.
 * @param reply.subject - Subject line of the reply.
 * @param reply.text - Body of the reply.
 * @param reply.files - Attachments to encrypt and upload before sending.
 * @throws NoRecipientsError when there is nobody to send the reply to.
 * @throws PrimaryRecipientMissingError when everybody is in copy.
 * @throws BlindCopyNotDeliverableError when the reply is delivered inside Internxt and has blind
 * copy recipients.
 */
export const encryptAndSendReply = async ({
  inReplyTo,
  replyAll,
  keepServerDerivedRecipients,
  to,
  cc,
  bcc,
  subject,
  text,
  files,
}: OutgoingReply): Promise<void> => {
  const { toAddresses, ccAddresses, bccAddresses, allAddresses } = normalizeRecipients({ to, cc, bcc });
  const { deliveryMode, activeDomains } = await resolveDelivery(allAddresses);
  assertBlindCopyIsDeliverable(deliveryMode, bccAddresses);

  const { encryption, attachments } = await encryptMessageForRecipients({
    allAddresses,
    activeDomains,
    text,
    preview: previewOf(text),
    files,
  });

  await mailboxService.replyEmail(inReplyTo, {
    replyAll,
    ...(keepServerDerivedRecipients ? {} : { to: toEmailAddresses(toAddresses) }),
    ...(ccAddresses.length > 0 ? { cc: toEmailAddresses(ccAddresses) } : {}),
    ...(bccAddresses.length > 0 ? { bcc: toEmailAddresses(bccAddresses) } : {}),
    subject,
    deliveryMode,
    encryption,
    ...(attachments.length > 0 ? { attachments } : {}),
  });
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
