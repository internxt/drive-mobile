import * as crypto from 'internxt-crypto';

import { DraftContent } from '../../types/mail';
import { logger } from '../common/logger/logger.service';
import { HTTP_CONFLICT, HTTP_INTERNAL_SERVER_ERROR, HTTP_NOT_FOUND } from '../common/httpStatusCodes';
import { discardDraft, openDraft, saveDraft } from './draft.service';
import { decryptFullEmail } from './mailCrypto.service';
import { mailboxService } from './mailbox.service';

jest.mock('../common/logger/logger.service', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

jest.mock('./mailbox.service', () => ({
  mailboxService: {
    getMailAccountKeys: jest.fn(),
    saveDraft: jest.fn(),
    updateDraft: jest.fn(),
    getDraft: jest.fn(),
    discardDraft: jest.fn(),
  },
}));

jest.mock('./mailCrypto.service', () => ({
  decryptFullEmail: jest.fn(),
  getPrivateHybridKey: jest.fn().mockResolvedValue(new Uint8Array([7])),
  isEncryptedEmailBody: (body: string | null | undefined) => !!body && body.startsWith('ENCRYPTED'),
  parseEncryptionBlock: () => ({ encryptedText: 'text' }),
  previewOf: (text: string) => text.slice(0, 256),
  toEmailAddresses: (addresses: string[]) => addresses.map((email) => ({ email })),
}));

jest.mock('internxt-crypto', () => ({
  genSymmetricKey: () => new Uint8Array([1, 2, 3]),
  base64ToUint8Array: (value: string) => new TextEncoder().encode(value),
  encryptEmailHybridForMultipleRecipients: jest.fn(),
}));

const getMailAccountKeysMock = mailboxService.getMailAccountKeys as jest.Mock;
const saveDraftMock = mailboxService.saveDraft as jest.Mock;
const updateDraftMock = mailboxService.updateDraft as jest.Mock;
const getDraftMock = mailboxService.getDraft as jest.Mock;
const discardDraftMock = mailboxService.discardDraft as jest.Mock;
const decryptFullEmailMock = decryptFullEmail as jest.Mock;
const encryptMock = jest.mocked(crypto.encryptEmailHybridForMultipleRecipients);

const EMPTY_DRAFT_CONTENT: DraftContent = { to: [], cc: [], bcc: [], subject: '', body: '', draftAttachments: null };

const draftContentWith = (content: Partial<DraftContent> = {}): DraftContent => ({
  ...EMPTY_DRAFT_CONTENT,
  subject: 'Plans',
  body: 'Hello there',
  ...content,
});

const httpErrorWithStatus = (status: number) => Object.assign(new Error('The request failed'), { status });

const A_KEPT_ATTACHMENT = { blobId: 'kept-blob', name: 'plan.pdf', type: 'application/pdf', size: 10 };

describe('Saving the draft of a message', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMailAccountKeysMock.mockResolvedValue({ address: 'me@inxt.me', publicKey: 'my-public-key' });
    encryptMock.mockResolvedValue({
      encryptedKeys: [{ encryptedForEmail: 'me@inxt.me', encryptedKey: 'k', hybridCiphertext: 'c' }],
      encEmail: { encText: 'text', encPreview: 'preview', encAttachmentsSessionKey: 'key' },
    } as never);
    saveDraftMock.mockResolvedValue({ id: 'created-draft' });
    updateDraftMock.mockResolvedValue({ id: 'updated-draft' });
  });

  test('when a message with nothing written in it is saved, then no draft is created', async () => {
    const savedDraftId = await saveDraft({ draftId: null, content: EMPTY_DRAFT_CONTENT });

    expect(savedDraftId).toBeNull();
    expect(saveDraftMock).not.toHaveBeenCalled();
  });

  test('when a message holds only an empty paragraph, then no draft is created', async () => {
    const savedDraftId = await saveDraft({ draftId: null, content: { ...EMPTY_DRAFT_CONTENT, body: '<p></p>' } });

    expect(savedDraftId).toBeNull();
    expect(saveDraftMock).not.toHaveBeenCalled();
  });

  test('when a draft is saved for the first time, then it is created and its id is returned', async () => {
    const savedDraftId = await saveDraft({ draftId: null, content: draftContentWith({ to: ['friend@inxt.me'] }) });

    expect(savedDraftId).toBe('created-draft');
    expect(saveDraftMock.mock.calls[0][0]).toMatchObject({ to: [{ email: 'friend@inxt.me' }], subject: 'Plans' });
  });

  test('when a draft that was already saved is saved again, then it is replaced and the new id is returned', async () => {
    const savedDraftId = await saveDraft({ draftId: 'draft-1', content: draftContentWith() });

    expect(savedDraftId).toBe('updated-draft');
    expect(updateDraftMock).toHaveBeenCalledWith('draft-1', expect.any(Object));
    expect(saveDraftMock).not.toHaveBeenCalled();
  });

  test('when a draft is saved, then only whoever writes it can decrypt it', async () => {
    await saveDraft({ draftId: null, content: draftContentWith({ to: ['friend@inxt.me'], cc: ['hidden@inxt.me'] }) });

    const recipientsTheDraftIsEncryptedFor = encryptMock.mock.calls[0][1].map((recipient) => recipient.email);
    expect(recipientsTheDraftIsEncryptedFor).toEqual(['me@inxt.me']);
  });

  test('when a draft is saved, then its body keeps its formatting and its opening is kept as plain text', async () => {
    await saveDraft({ draftId: null, content: draftContentWith({ body: '<p>Hello <b>there</b></p>' }) });

    expect(encryptMock.mock.calls[0][0].text).toBe('<p>Hello <b>there</b></p>');
    expect(encryptMock.mock.calls[0][0].preview).toBe('Hello there');
  });

  test('when saving a draft is rejected because it changed elsewhere, then the save is retried', async () => {
    updateDraftMock.mockRejectedValueOnce(httpErrorWithStatus(HTTP_CONFLICT));

    const savedDraftId = await saveDraft({ draftId: 'draft-1', content: draftContentWith() });

    expect(savedDraftId).toBe('updated-draft');
    expect(updateDraftMock).toHaveBeenCalledTimes(2);
  });

  test('when the draft keeps changing elsewhere, then what was written is saved as a new draft instead of being lost', async () => {
    updateDraftMock.mockRejectedValue(httpErrorWithStatus(HTTP_CONFLICT));

    const savedDraftId = await saveDraft({ draftId: 'draft-1', content: draftContentWith() });

    expect(savedDraftId).toBe('created-draft');
    expect(saveDraftMock).toHaveBeenCalledTimes(1);
  });

  test('when the draft no longer exists, then what was written is saved as a new draft', async () => {
    updateDraftMock.mockRejectedValue(httpErrorWithStatus(HTTP_NOT_FOUND));

    const savedDraftId = await saveDraft({ draftId: 'draft-1', content: draftContentWith() });

    expect(savedDraftId).toBe('created-draft');
    expect(updateDraftMock).toHaveBeenCalledTimes(1);
  });

  test('when a draft is saved as a new one, then the reason is noted in the log without naming the draft', async () => {
    updateDraftMock.mockRejectedValue(httpErrorWithStatus(HTTP_NOT_FOUND));

    await saveDraft({ draftId: 'draft-1', content: draftContentWith() });

    expect(logger.warn).toHaveBeenCalledWith(expect.any(String), { status: HTTP_NOT_FOUND });
    expect(JSON.stringify((logger.warn as jest.Mock).mock.calls)).not.toContain('draft-1');
  });

  test('when saving fails for any other reason, then the failure is reported', async () => {
    updateDraftMock.mockRejectedValue(httpErrorWithStatus(HTTP_INTERNAL_SERVER_ERROR));

    await expect(saveDraft({ draftId: 'draft-1', content: draftContentWith() })).rejects.toThrow();
    expect(saveDraftMock).not.toHaveBeenCalled();
  });

  test('when a new message holds nothing but the key for its attachments, then no draft is created', async () => {
    const savedDraftId = await saveDraft({
      draftId: null,
      content: {
        ...EMPTY_DRAFT_CONTENT,
        draftAttachments: { attachmentsSessionKey: 'the-compose-key', attachments: [] },
      },
    });

    expect(savedDraftId).toBeNull();
    expect(saveDraftMock).not.toHaveBeenCalled();
  });

  test('when a draft carries attachments, then they are saved with it and keep the key they were encrypted with', async () => {
    const draftAttachments = { attachmentsSessionKey: 'the-draft-key', attachments: [A_KEPT_ATTACHMENT] };

    await saveDraft({ draftId: null, content: draftContentWith({ draftAttachments }) });

    expect(saveDraftMock.mock.calls[0][0].attachments).toEqual([A_KEPT_ATTACHMENT]);
    expect(encryptMock.mock.calls[0][0].attachmentsSessionKey).toEqual(new TextEncoder().encode('the-draft-key'));
  });
});

describe('Opening a draft to keep writing it', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('when a draft written on the phone is opened, then its recipients, subject, attachments and body come back ready to edit', async () => {
    getDraftMock.mockResolvedValue({
      id: 'draft-1',
      to: [{ email: 'friend@inxt.me' }],
      cc: [],
      bcc: [{ email: 'hidden@inxt.me' }],
      subject: 'Plans',
      textBody: 'ENCRYPTED envelope',
      attachments: [A_KEPT_ATTACHMENT],
    });
    decryptFullEmailMock.mockResolvedValue({
      text: '<p>Hello <b>there</b></p>',
      attachmentsSessionKey: 'the-draft-key',
    });

    const openedDraft = await openDraft({ draftId: 'draft-1', mnemonic: 'the words' });

    expect(openedDraft).toEqual({
      to: ['friend@inxt.me'],
      cc: [],
      bcc: ['hidden@inxt.me'],
      subject: 'Plans',
      body: '<p>Hello <b>there</b></p>',
      draftAttachments: { attachmentsSessionKey: 'the-draft-key', attachments: [A_KEPT_ATTACHMENT] },
    });
  });

  test('when a draft written in the browser is opened, then its body comes back as it was written', async () => {
    getDraftMock.mockResolvedValue({ id: 'draft-1', to: [], subject: 'Plans', textBody: 'ENCRYPTED envelope' });
    decryptFullEmailMock.mockResolvedValue({
      text: '<p>Hello</p><p>see you</p>',
      attachmentsSessionKey: 'the-draft-key',
    });

    const openedDraft = await openDraft({ draftId: 'draft-1', mnemonic: 'the words' });

    expect(openedDraft.body).toBe('<p>Hello</p><p>see you</p>');
  });

  test('when a draft without attachments is opened, then the key its attachments are encrypted with still comes back', async () => {
    getDraftMock.mockResolvedValue({ id: 'draft-1', to: [], subject: 'Plans', textBody: 'ENCRYPTED envelope' });
    decryptFullEmailMock.mockResolvedValue({ text: 'Hello', attachmentsSessionKey: 'the-draft-key' });

    const openedDraft = await openDraft({ draftId: 'draft-1', mnemonic: 'the words' });

    expect(openedDraft.draftAttachments).toEqual({ attachmentsSessionKey: 'the-draft-key', attachments: [] });
  });

  test('when a draft was stored without encryption, then its body is read as it is', async () => {
    getDraftMock.mockResolvedValue({ id: 'draft-1', to: [], subject: 'Plans', textBody: 'Just text', htmlBody: null });

    const openedDraft = await openDraft({ draftId: 'draft-1', mnemonic: 'the words' });

    expect(openedDraft.body).toBe('Just text');
    expect(decryptFullEmailMock).not.toHaveBeenCalled();
  });
});

describe('Discarding a draft', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('when a draft is discarded, then it is removed from the server', async () => {
    discardDraftMock.mockResolvedValue(undefined);

    await discardDraft('draft-1');

    expect(discardDraftMock).toHaveBeenCalledWith('draft-1');
  });

  test('when the draft no longer exists, then it counts as discarded', async () => {
    discardDraftMock.mockRejectedValue(httpErrorWithStatus(HTTP_NOT_FOUND));

    await expect(discardDraft('draft-1')).resolves.toBeUndefined();
  });

  test('when the draft cannot be discarded for any other reason, then the failure is reported', async () => {
    discardDraftMock.mockRejectedValue(httpErrorWithStatus(HTTP_INTERNAL_SERVER_ERROR));

    await expect(discardDraft('draft-1')).rejects.toThrow();
  });
});
