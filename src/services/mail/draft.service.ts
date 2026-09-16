import type { DraftEmailRequest, EmailAddress, EmailResponse } from '@internxt/sdk/dist/mail/types';
import { base64ToUint8Array, encryptEmailHybridForMultipleRecipients, genSymmetricKey } from 'internxt-crypto';

import { DraftContent } from '../../types/mail';
import { HTTP_CONFLICT, HTTP_NOT_FOUND } from '../common/httpStatusCodes';
import { logger } from '../common/logger/logger.service';
import { editableTextFromHtml, isMarkupBody, plainTextToHtml } from './emailBody/emailBodyContent';
import { readHttpStatus } from './errorDescription';
import { mailboxService } from './mailbox.service';
import {
  decryptFullEmail,
  getPrivateHybridKey,
  isEncryptedEmailBody,
  parseEncryptionBlock,
  previewOf,
  toEmailAddresses,
} from './mailCrypto.service';

const isDraftContentEmpty = ({ to, cc, bcc, subject, body, draftAttachments }: DraftContent): boolean =>
  to.length === 0 &&
  cc.length === 0 &&
  bcc.length === 0 &&
  subject.trim().length === 0 &&
  body.trim().length === 0 &&
  !draftAttachments?.attachments.length;

const buildDraftRequest = async ({
  to,
  cc,
  bcc,
  subject,
  body,
  draftAttachments,
}: DraftContent): Promise<DraftEmailRequest> => {
  const senderKeys = await mailboxService.getMailAccountKeys();
  const attachmentsSessionKey = draftAttachments
    ? base64ToUint8Array(draftAttachments.attachmentsSessionKey)
    : genSymmetricKey();

  const { encryptedKeys, encEmail } = await encryptEmailHybridForMultipleRecipients(
    { text: plainTextToHtml(body), preview: previewOf(body), attachmentsSessionKey },
    [{ email: senderKeys.address.trim().toLowerCase(), publicHybridKey: base64ToUint8Array(senderKeys.publicKey) }],
  );

  return {
    ...(to.length > 0 ? { to: toEmailAddresses(to) } : {}),
    ...(cc.length > 0 ? { cc: toEmailAddresses(cc) } : {}),
    ...(bcc.length > 0 ? { bcc: toEmailAddresses(bcc) } : {}),
    ...(subject.trim().length > 0 ? { subject } : {}),
    encryption: {
      version: 'v3',
      encryptedText: encEmail.encText,
      encryptedPreview: encEmail.encPreview,
      encryptedAttachmentsSessionKey: encEmail.encAttachmentsSessionKey,
      wrappedKeys: encryptedKeys,
    },
    ...(draftAttachments && draftAttachments.attachments.length > 0
      ? { attachments: draftAttachments.attachments }
      : {}),
  };
};

const updateDraftRetryingOnceOnConflict = async (
  draftId: string,
  draftRequest: DraftEmailRequest,
): Promise<EmailResponse> => {
  try {
    return await mailboxService.updateDraft(draftId, draftRequest);
  } catch (error) {
    if (readHttpStatus(error) !== HTTP_CONFLICT) {
      throw error;
    }
    return mailboxService.updateDraft(draftId, draftRequest);
  }
};

const isDraftGoneOrChangedElsewhere = (error: unknown): boolean => {
  const httpStatus = readHttpStatus(error);
  return httpStatus === HTTP_CONFLICT || httpStatus === HTTP_NOT_FOUND;
};

export const saveDraft = async ({
  draftId,
  content,
}: {
  draftId: string | null;
  content: DraftContent;
}): Promise<string | null> => {
  if (!draftId && isDraftContentEmpty(content)) {
    return null;
  }

  const draftRequest = await buildDraftRequest(content);
  if (!draftId) {
    const createdDraft = await mailboxService.saveDraft(draftRequest);
    return createdDraft.id;
  }

  try {
    const updatedDraft = await updateDraftRetryingOnceOnConflict(draftId, draftRequest);
    return updatedDraft.id;
  } catch (error) {
    if (!isDraftGoneOrChangedElsewhere(error)) {
      throw error;
    }
    logger.warn('The draft could not be replaced, so it is saved as a new draft', { status: readHttpStatus(error) });
    const recreatedDraft = await mailboxService.saveDraft(draftRequest);
    return recreatedDraft.id;
  }
};

const addressesOf = (addresses: EmailAddress[] | null | undefined): string[] =>
  (addresses ?? []).map(({ email }) => email);

const readDraftBody = async (
  draft: EmailResponse,
  mnemonic: string,
): Promise<Pick<DraftContent, 'body' | 'draftAttachments'>> => {
  const storedBody = draft.textBody;
  if (!storedBody || !isEncryptedEmailBody(storedBody)) {
    return { body: draft.htmlBody ? editableTextFromHtml(draft.htmlBody) : (storedBody ?? ''), draftAttachments: null };
  }

  const privateKey = await getPrivateHybridKey(mnemonic);
  const { text, attachmentsSessionKey } = await decryptFullEmail(parseEncryptionBlock(storedBody), privateKey);

  return {
    body: isMarkupBody(text) ? editableTextFromHtml(text) : text,
    draftAttachments: { attachmentsSessionKey, attachments: draft.attachments ?? [] },
  };
};

export const openDraft = async ({
  draftId,
  mnemonic,
}: {
  draftId: string;
  mnemonic: string;
}): Promise<DraftContent> => {
  const draft = await mailboxService.getDraft(draftId);
  const { body, draftAttachments } = await readDraftBody(draft, mnemonic);

  return {
    to: addressesOf(draft.to),
    cc: addressesOf(draft.cc),
    bcc: addressesOf(draft.bcc),
    subject: draft.subject ?? '',
    body,
    draftAttachments,
  };
};

export const discardDraft = async (draftId: string): Promise<void> => {
  try {
    await mailboxService.discardDraft(draftId);
  } catch (error) {
    if (readHttpStatus(error) !== HTTP_NOT_FOUND) {
      throw error;
    }
  }
};
