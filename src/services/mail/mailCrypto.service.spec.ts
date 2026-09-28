import * as crypto from 'internxt-crypto';
import strings from '../../../assets/lang/strings';
import AppService from '../AppService';
import { logger } from '../common/logger/logger.service';
import {
  ActiveDomainsUnavailableError,
  AttachmentTooLargeError,
  AttachmentUploadFailedError,
  BlindCopyNotDeliverableError,
  ForwardedAttachmentUnavailableError,
  ForwardedAttachmentsNotDecryptableError,
  InternxtRecipientKeyMissingError,
  NoRecipientsError,
  PrimaryRecipientMissingError,
  ServerPublicKeyMissingError,
} from './errors';
import { SendStage } from '../../types/mail';
import { fs } from '../FileSystemService';
import { discardMaterializedAttachments, materializeForwardedAttachments } from './forwardAttachments';
import { decryptPreviews, encryptAndSendEmail, encryptAndSendForward, encryptAndSendReply } from './mailCrypto.service';
import { mailboxService } from './mailbox.service';
import { recipientKeysService } from './recipientKeys.service';

jest.mock('./mailbox.service', () => ({
  mailboxService: {
    getActiveDomains: jest.fn(),
    getMailAccountKeys: jest.fn(),
    sendEmail: jest.fn(),
    replyEmail: jest.fn(),
    uploadAttachment: jest.fn(),
  },
}));

jest.mock('./forwardAttachments', () => ({
  materializeForwardedAttachments: jest.fn(),
  discardMaterializedAttachments: jest.fn(),
}));

jest.mock('../FileSystemService', () => ({
  AcceptedEncodings: { Base64: 'base64' },
  fs: {
    tmpFilePath: (name: string) => `/tmp/${name}`,
    pathToUri: (path: string) => path,
    readFile: jest.fn().mockResolvedValue(Buffer.from('the attachment')),
    createFile: jest.fn(),
    unlinkIfExists: jest.fn(),
  },
}));

jest.mock('./recipientKeys.service', () => ({
  recipientKeysService: { getPublicKeys: jest.fn() },
}));

jest.mock('../common/logger/logger.service', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../AsyncStorageService', () => ({
  __esModule: true,
  default: { getItem: jest.fn().mockResolvedValue('me@inxt.me'), saveItem: jest.fn() },
}));

jest.mock('react-native-uuid', () => ({
  __esModule: true,
  default: { v4: () => 'a-temporary-name' },
}));

jest.mock('internxt-crypto', () => ({
  KeystoreType: { ENCRYPTION: 'encryption' },
  genSymmetricKey: () => new Uint8Array([1, 2, 3]),
  base64ToUint8Array: (value: string) => new TextEncoder().encode(value),
  uint8ArrayToBase64: (value: Uint8Array) => new TextDecoder().decode(value),
  uint8ToUTF8: (value: Uint8Array) => new TextDecoder().decode(value),
  openEncryptionKeystore: jest.fn(),
  decryptSymmetrically: jest.fn(),
  encryptSymmetrically: jest.fn().mockResolvedValue(new Uint8Array([9, 9, 9])),
  decryptEmailHybrid: jest.fn(),
  decryptEmailPreviewHybrid: jest.fn(),
  encryptEmailHybridForMultipleRecipients: jest.fn(),
}));

const SENDER = { address: 'me@inxt.me', publicKey: 'sender-key' };
const SERVER_PUBLIC_KEY = 'test-server-public-key';
const ACTIVE_DOMAINS = [{ domain: 'inxt.me' }];

const getActiveDomainsMock = mailboxService.getActiveDomains as jest.Mock;
const getMailAccountKeysMock = mailboxService.getMailAccountKeys as jest.Mock;
const sendEmailMock = mailboxService.sendEmail as jest.Mock;
const getPublicKeysMock = recipientKeysService.getPublicKeys as jest.Mock;
const encryptMock = jest.mocked(crypto.encryptEmailHybridForMultipleRecipients);

const sentBody = () => sendEmailMock.mock.calls[0][0];

const wrappedFor = (address: string) => {
  const recipient = encryptMock.mock.calls[0][1].find((candidate) => candidate.email === address);
  if (!recipient) {
    throw new Error(`The message was encrypted without a wrap for ${address}`);
  }
  return recipient;
};

const keyAsText = (recipient: { publicHybridKey: Uint8Array }) => new TextDecoder().decode(recipient.publicHybridKey);

const recipientsAskedToEncrypt = (): string[] =>
  encryptMock.mock.calls[0][1].map((recipient: { email: string }) => recipient.email);

describe('Sending an encrypted email', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(AppService, 'constants', 'get').mockReturnValue({ SERVER_PUBLIC_KEY });
    getActiveDomainsMock.mockResolvedValue(ACTIVE_DOMAINS);
    getMailAccountKeysMock.mockResolvedValue(SENDER);
    sendEmailMock.mockResolvedValue({ id: 'sent-id' });
    encryptMock.mockResolvedValue({
      encryptedKeys: [{ encryptedForEmail: 'someone', encryptedKey: 'k', hybridCiphertext: 'c' }],
      encEmail: { encText: 'text', encPreview: 'preview', encAttachmentsSessionKey: 'attachments' },
    });
  });

  test('when the recipients are a mix of an internal user and an external address, then every recipient gets their own wrap and only the external one is wrapped with the server key', async () => {
    getPublicKeysMock.mockResolvedValue([
      { address: 'friend@inxt.me', publicKey: 'friend-key' },
      { address: 'someone@gmail.com', publicKey: null },
    ]);

    await encryptAndSendEmail({ to: ['friend@inxt.me', 'someone@gmail.com'], subject: 'Subject', text: 'Body' });

    expect(keyAsText(wrappedFor('friend@inxt.me'))).toBe('friend-key');
    expect(keyAsText(wrappedFor('someone@gmail.com'))).toBe(SERVER_PUBLIC_KEY);
  });

  test('when a message is written on several lines, then it travels as markup, so no reader collapses it into one line', async () => {
    getPublicKeysMock.mockResolvedValue([{ address: 'friend@inxt.me', publicKey: 'friend-key' }]);

    await encryptAndSendEmail({
      to: ['friend@inxt.me'],
      subject: 'Subject',
      text: 'Hello there,\n\nHere are the numbers',
    });

    const encryptedEmail = encryptMock.mock.calls[0][0];
    expect(encryptedEmail.text).toContain('white-space:pre-wrap');
    expect(encryptedEmail.text).toContain('Hello there,\n\nHere are the numbers');
  });

  test('when a message names an address between angle brackets, then it is not read as markup by whoever displays it', async () => {
    getPublicKeysMock.mockResolvedValue([{ address: 'friend@inxt.me', publicKey: 'friend-key' }]);

    await encryptAndSendEmail({
      to: ['friend@inxt.me'],
      subject: 'Subject',
      text: 'Write to Ramon <ramon@inxt.eu>',
    });

    const encryptedEmail = encryptMock.mock.calls[0][0];
    expect(encryptedEmail.text).toContain('Write to Ramon &lt;ramon@inxt.eu&gt;');
  });

  test('when a message is written on several lines, then the mailbox list still shows its opening as plain text', async () => {
    getPublicKeysMock.mockResolvedValue([{ address: 'friend@inxt.me', publicKey: 'friend-key' }]);

    await encryptAndSendEmail({
      to: ['friend@inxt.me'],
      subject: 'Subject',
      text: 'Hello there,\n\nHere are the numbers',
    });

    const encryptedEmail = encryptMock.mock.calls[0][0];
    expect(encryptedEmail.preview).toBe('Hello there,\n\nHere are the numbers');
  });

  test('when a recipient with an internal domain has no published key, then sending fails instead of delivering an unreadable message', async () => {
    getPublicKeysMock.mockResolvedValue([{ address: 'friend@inxt.me', publicKey: null }]);

    await expect(
      encryptAndSendEmail({ to: ['friend@inxt.me'], subject: 'Subject', text: 'Body' }),
    ).rejects.toBeInstanceOf(InternxtRecipientKeyMissingError);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  test('when every recipient is external, then the message is still encrypted', async () => {
    getPublicKeysMock.mockResolvedValue([{ address: 'someone@gmail.com', publicKey: null }]);

    await encryptAndSendEmail({ to: ['someone@gmail.com'], subject: 'Subject', text: 'Body' });

    expect(sentBody().encryption.encryptedText).toBe('text');
    expect(sentBody().textBody).toBeUndefined();
  });

  test('when a message is sent, then the sender can decrypt it from the sent folder', async () => {
    getPublicKeysMock.mockResolvedValue([{ address: 'friend@inxt.me', publicKey: 'friend-key' }]);

    await encryptAndSendEmail({ to: ['friend@inxt.me'], subject: 'Subject', text: 'Body' });

    expect(keyAsText(wrappedFor(SENDER.address))).toBe('sender-key');
  });

  test('when at least one recipient is external, then the message is sent in external delivery mode', async () => {
    getPublicKeysMock.mockResolvedValue([
      { address: 'friend@inxt.me', publicKey: 'friend-key' },
      { address: 'someone@gmail.com', publicKey: null },
    ]);

    await encryptAndSendEmail({ to: ['friend@inxt.me', 'someone@gmail.com'], subject: 'Subject', text: 'Body' });

    expect(sentBody().deliveryMode).toBe('EXTERNAL');
  });

  test('when every recipient has an active domain, then the message is sent in internal delivery mode', async () => {
    getPublicKeysMock.mockResolvedValue([{ address: 'friend@inxt.me', publicKey: 'friend-key' }]);

    await encryptAndSendEmail({ to: ['friend@inxt.me'], subject: 'Subject', text: 'Body' });

    expect(sentBody().deliveryMode).toBe('INTERNXT');
  });

  test('when the list of active domains cannot be fetched, then sending is blocked instead of guessing the delivery mode', async () => {
    getActiveDomainsMock.mockRejectedValue(new Error('network down'));

    await expect(
      encryptAndSendEmail({ to: ['friend@inxt.me'], subject: 'Subject', text: 'Body' }),
    ).rejects.toBeInstanceOf(ActiveDomainsUnavailableError);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  test('when there is nobody to send the message to, then sending is blocked before any key is requested', async () => {
    await expect(encryptAndSendEmail({ to: [], subject: 'Subject', text: 'Body' })).rejects.toBeInstanceOf(
      NoRecipientsError,
    );

    expect(getPublicKeysMock).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  test('when the server reports no active domains at all, then sending is blocked instead of treating everyone as external', async () => {
    getActiveDomainsMock.mockResolvedValue([]);
    getPublicKeysMock.mockResolvedValue([{ address: 'friend@inxt.me', publicKey: 'friend-key' }]);

    await expect(
      encryptAndSendEmail({ to: ['friend@inxt.me'], subject: 'Subject', text: 'Body' }),
    ).rejects.toBeInstanceOf(ActiveDomainsUnavailableError);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  test('when the sender writes to their own address, then only one wrap is built for them', async () => {
    getPublicKeysMock.mockResolvedValue([{ address: SENDER.address, publicKey: 'stale-key' }]);

    await encryptAndSendEmail({ to: [SENDER.address], subject: 'Subject', text: 'Body' });

    const wrapsForSender = encryptMock.mock.calls[0][1].filter(
      (recipient: { email: string }) => recipient.email === SENDER.address,
    );
    expect(wrapsForSender).toHaveLength(1);
    expect(keyAsText(wrapsForSender[0])).toBe('sender-key');
  });

  test('when there are recipients in copy, then they get their own wrap and travel in the copy field', async () => {
    getPublicKeysMock.mockResolvedValue([
      { address: 'friend@inxt.me', publicKey: 'friend-key' },
      { address: 'watcher@inxt.me', publicKey: 'watcher-key' },
    ]);

    await encryptAndSendEmail({
      to: ['friend@inxt.me'],
      cc: ['watcher@inxt.me'],
      subject: 'Subject',
      text: 'Body',
    });

    expect(keyAsText(wrappedFor('watcher@inxt.me'))).toBe('watcher-key');
    expect(sentBody().to).toEqual([{ email: 'friend@inxt.me' }]);
    expect(sentBody().cc).toEqual([{ email: 'watcher@inxt.me' }]);
  });

  test('when a message with a blind copy recipient leaves Internxt, then it is sent and the blind copy travels in its own field', async () => {
    getPublicKeysMock.mockResolvedValue([
      { address: 'someone@gmail.com', publicKey: null },
      { address: 'hidden@inxt.me', publicKey: 'hidden-key' },
    ]);

    await encryptAndSendEmail({
      to: ['someone@gmail.com'],
      bcc: ['hidden@inxt.me'],
      subject: 'Subject',
      text: 'Body',
    });

    expect(sentBody().deliveryMode).toBe('EXTERNAL');
    expect(sentBody().bcc).toEqual([{ email: 'hidden@inxt.me' }]);
    expect(sentBody().to).toEqual([{ email: 'someone@gmail.com' }]);
    expect(sentBody().cc).toBeUndefined();
    expect(keyAsText(wrappedFor('hidden@inxt.me'))).toBe('hidden-key');
  });

  test('when every recipient is on an Internxt domain and one of them is in blind copy, then sending is blocked because the envelope names them all', async () => {
    await expect(
      encryptAndSendEmail({
        to: ['friend@inxt.me'],
        bcc: ['hidden@inxt.me'],
        subject: 'Subject',
        text: 'Body',
      }),
    ).rejects.toBeInstanceOf(BlindCopyNotDeliverableError);

    expect(getPublicKeysMock).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  test('when a message has nobody in the main recipient field, then sending is blocked even if there are recipients in copy', async () => {
    await expect(
      encryptAndSendEmail({ to: [], cc: ['watcher@inxt.me'], subject: 'Subject', text: 'Body' }),
    ).rejects.toBeInstanceOf(PrimaryRecipientMissingError);

    expect(getPublicKeysMock).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  test('when a message goes to both an Internxt address and an outside one and has a blind copy, then it is sent because it leaves Internxt', async () => {
    getPublicKeysMock.mockResolvedValue([
      { address: 'friend@inxt.me', publicKey: 'friend-key' },
      { address: 'someone@gmail.com', publicKey: null },
      { address: 'hidden@inxt.me', publicKey: 'hidden-key' },
    ]);

    await encryptAndSendEmail({
      to: ['friend@inxt.me', 'someone@gmail.com'],
      bcc: ['hidden@inxt.me'],
      subject: 'Subject',
      text: 'Body',
    });

    expect(sentBody().deliveryMode).toBe('EXTERNAL');
    expect(sentBody().to).toEqual([{ email: 'friend@inxt.me' }, { email: 'someone@gmail.com' }]);
    expect(sentBody().bcc).toEqual([{ email: 'hidden@inxt.me' }]);
    expect(recipientsAskedToEncrypt()).toEqual([
      'friend@inxt.me',
      'someone@gmail.com',
      'hidden@inxt.me',
      SENDER.address,
    ]);
  });

  test('when the only recipient outside Internxt is the one in blind copy, then the message is still sent outside Internxt', async () => {
    getPublicKeysMock.mockResolvedValue([
      { address: 'friend@inxt.me', publicKey: 'friend-key' },
      { address: 'someone@gmail.com', publicKey: null },
    ]);

    await encryptAndSendEmail({
      to: ['friend@inxt.me'],
      bcc: ['someone@gmail.com'],
      subject: 'Subject',
      text: 'Body',
    });

    expect(sentBody().deliveryMode).toBe('EXTERNAL');
    expect(sentBody().bcc).toEqual([{ email: 'someone@gmail.com' }]);
  });

  test('when the only recipient in blind copy is already a main recipient, then the message is sent and nobody stays hidden', async () => {
    getPublicKeysMock.mockResolvedValue([{ address: 'friend@inxt.me', publicKey: 'friend-key' }]);

    await encryptAndSendEmail({
      to: ['friend@inxt.me'],
      bcc: ['Friend@INXT.me'],
      subject: 'Subject',
      text: 'Body',
    });

    expect(sentBody().to).toEqual([{ email: 'friend@inxt.me' }]);
    expect(sentBody().bcc).toBeUndefined();
  });

  test('when someone in blind copy is already in copy, then they only travel in the copy field', async () => {
    getPublicKeysMock.mockResolvedValue([
      { address: 'friend@inxt.me', publicKey: 'friend-key' },
      { address: 'watcher@inxt.me', publicKey: 'watcher-key' },
      { address: 'someone@gmail.com', publicKey: null },
    ]);

    await encryptAndSendEmail({
      to: ['someone@gmail.com'],
      cc: ['watcher@inxt.me'],
      bcc: ['Watcher@INXT.me'],
      subject: 'Subject',
      text: 'Body',
    });

    expect(sentBody().cc).toEqual([{ email: 'watcher@inxt.me' }]);
    expect(sentBody().bcc).toBeUndefined();
  });

  test('when someone is both a main recipient and in copy, then they are only wrapped once and stay in the main field', async () => {
    getPublicKeysMock.mockResolvedValue([{ address: 'friend@inxt.me', publicKey: 'friend-key' }]);

    await encryptAndSendEmail({
      to: ['friend@inxt.me'],
      cc: ['Friend@INXT.me'],
      subject: 'Subject',
      text: 'Body',
    });

    expect(getPublicKeysMock).toHaveBeenCalledWith(['friend@inxt.me']);
    expect(sentBody().to).toEqual([{ email: 'friend@inxt.me' }]);
    expect(sentBody().cc).toBeUndefined();
  });

  test('when the same recipient is typed twice, then they are only asked for once and appear once in the message', async () => {
    getPublicKeysMock.mockResolvedValue([{ address: 'friend@inxt.me', publicKey: 'friend-key' }]);

    await encryptAndSendEmail({ to: ['Friend@inxt.me', 'friend@INXT.me'], subject: 'Subject', text: 'Body' });

    expect(getPublicKeysMock).toHaveBeenCalledWith(['friend@inxt.me']);
    expect(sentBody().to).toEqual([{ email: 'friend@inxt.me' }]);
  });
});

describe('Sending a message with an attachment', () => {
  const uploadAttachmentMock = mailboxService.uploadAttachment as jest.Mock;
  const unlinkIfExistsMock = fs.unlinkIfExists as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(AppService, 'constants', 'get').mockReturnValue({ SERVER_PUBLIC_KEY });
    getActiveDomainsMock.mockResolvedValue(ACTIVE_DOMAINS);
    getMailAccountKeysMock.mockResolvedValue(SENDER);
    sendEmailMock.mockResolvedValue({ id: 'sent-id' });
    getPublicKeysMock.mockResolvedValue([{ address: 'friend@inxt.me', publicKey: 'friend-key' }]);
    uploadAttachmentMock.mockResolvedValue({
      blobId: 'new-blob',
      name: 'report.pdf',
      type: 'application/pdf',
      size: 1024,
    });
    encryptMock.mockResolvedValue({
      encryptedKeys: [{ encryptedForEmail: 'someone', encryptedKey: 'k', hybridCiphertext: 'c' }],
      encEmail: { encText: 'text', encPreview: 'preview', encAttachmentsSessionKey: 'attachments' },
    });
  });

  test('when an attachment has been uploaded, then the encrypted copy of it is not left on the device', async () => {
    await encryptAndSendEmail({
      to: ['friend@inxt.me'],
      subject: 'Subject',
      text: 'Body',
      files: [{ uri: '/tmp/report.pdf', name: 'report.pdf', type: 'application/pdf' }],
    });

    expect(unlinkIfExistsMock).toHaveBeenCalledWith('/tmp/a-temporary-name');
  });

  test('when an attachment is over the size the server takes, then it is refused before anything is uploaded', async () => {
    await expect(
      encryptAndSendEmail({
        to: ['friend@inxt.me'],
        subject: 'Subject',
        text: 'Body',
        files: [{ uri: '/tmp/huge.zip', name: 'huge.zip', type: 'application/zip', size: 30 * 1024 * 1024 }],
      }),
    ).rejects.toBeInstanceOf(AttachmentTooLargeError);

    expect(uploadAttachmentMock).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  test('when an attachment cannot be uploaded, then the message is not sent and the attachment is named', async () => {
    uploadAttachmentMock.mockRejectedValue(new Error('the server is unreachable'));

    await expect(
      encryptAndSendEmail({
        to: ['friend@inxt.me'],
        subject: 'Subject',
        text: 'Body',
        files: [{ uri: '/tmp/report.pdf', name: 'report.pdf', type: 'application/pdf' }],
      }),
    ).rejects.toMatchObject({ name: new AttachmentUploadFailedError('report.pdf').name, attachmentName: 'report.pdf' });

    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  test('when an attachment upload fails, then the encrypted copy is still deleted', async () => {
    uploadAttachmentMock.mockRejectedValue(new Error('the server is unreachable'));

    await expect(
      encryptAndSendEmail({
        to: ['friend@inxt.me'],
        subject: 'Subject',
        text: 'Body',
        files: [{ uri: '/tmp/report.pdf', name: 'report.pdf', type: 'application/pdf' }],
      }),
    ).rejects.toThrow();

    expect(unlinkIfExistsMock).toHaveBeenCalledWith('/tmp/a-temporary-name');
  });

  test('when a message carries several attachments, then they are uploaded one after another', async () => {
    let uploadsInFlight = 0;
    let mostUploadsAtOnce = 0;
    uploadAttachmentMock.mockImplementation(async () => {
      uploadsInFlight += 1;
      mostUploadsAtOnce = Math.max(mostUploadsAtOnce, uploadsInFlight);
      await Promise.resolve();
      uploadsInFlight -= 1;
      return { blobId: 'new-blob', name: 'report.pdf', type: 'application/pdf', size: 1024 };
    });

    await encryptAndSendEmail({
      to: ['friend@inxt.me'],
      subject: 'Subject',
      text: 'Body',
      files: [
        { uri: '/tmp/one.pdf', name: 'one.pdf', type: 'application/pdf' },
        { uri: '/tmp/two.pdf', name: 'two.pdf', type: 'application/pdf' },
        { uri: '/tmp/three.pdf', name: 'three.pdf', type: 'application/pdf' },
      ],
    });

    expect(uploadAttachmentMock).toHaveBeenCalledTimes(3);
    expect(mostUploadsAtOnce).toBe(1);
  });
});

describe('Sending without the server public key configured', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getActiveDomainsMock.mockResolvedValue(ACTIVE_DOMAINS);
    getMailAccountKeysMock.mockResolvedValue(SENDER);
    jest.spyOn(AppService, 'constants', 'get').mockReturnValue({ SERVER_PUBLIC_KEY: '' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('when an external recipient needs the server key and it is not configured, then sending is blocked', async () => {
    getPublicKeysMock.mockResolvedValue([{ address: 'someone@gmail.com', publicKey: null }]);

    await expect(
      encryptAndSendEmail({ to: ['someone@gmail.com'], subject: 'Subject', text: 'Body' }),
    ).rejects.toBeInstanceOf(ServerPublicKeyMissingError);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});

describe('Reading a message that cannot be decrypted', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('when a preview cannot be decrypted, then the reason is logged instead of being swallowed', async () => {
    const failure = new Error('wrapped key does not open');
    (crypto.decryptEmailPreviewHybrid as jest.Mock).mockRejectedValue(failure);
    const encryption = {
      wrappedKeys: [{ encryptedForEmail: 'me@inxt.me', encryptedKey: 'k', hybridCiphertext: 'c' }],
      encryptedPreview: 'preview',
    };

    const [email] = await decryptPreviews([{ id: 'email-1', encryption } as never], new Uint8Array([1]));

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('email-1'), failure);
    expect(email.preview).toBe(strings.screens.mail.unableToDecryptPreview);
  });
});

describe('Sending an encrypted reply', () => {
  const replyEmailMock = mailboxService.replyEmail as jest.Mock;
  const replyRequestBody = () => replyEmailMock.mock.calls[0][1];
  const repliedMessageId = () => replyEmailMock.mock.calls[0][0];

  const reply = {
    inReplyTo: 'original-id',
    replyAll: false,
    keepServerDerivedRecipients: true,
    to: ['friend@inxt.me'],
    subject: 'Re: Subject',
    text: 'Body',
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(AppService, 'constants', 'get').mockReturnValue({ SERVER_PUBLIC_KEY });
    getActiveDomainsMock.mockResolvedValue(ACTIVE_DOMAINS);
    getMailAccountKeysMock.mockResolvedValue(SENDER);
    replyEmailMock.mockResolvedValue({ id: 'reply-id' });
    getPublicKeysMock.mockResolvedValue([{ address: 'friend@inxt.me', publicKey: 'friend-key' }]);
    encryptMock.mockResolvedValue({
      encryptedKeys: [{ encryptedForEmail: 'someone', encryptedKey: 'k', hybridCiphertext: 'c' }],
      encEmail: { encText: 'text', encPreview: 'preview', encAttachmentsSessionKey: 'attachments' },
    });
  });

  test('when a reply is sent, then it travels to the message being answered and never as a new message', async () => {
    await encryptAndSendReply(reply);

    expect(repliedMessageId()).toBe('original-id');
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  test('when the recipients are the ones worked out from the original, then the server is left to address the reply', async () => {
    await encryptAndSendReply(reply);

    expect(replyRequestBody().to).toBeUndefined();
  });

  test('when the user has changed the recipients, then they travel in the request instead of being worked out again', async () => {
    await encryptAndSendReply({ ...reply, keepServerDerivedRecipients: false });

    expect(replyRequestBody().to).toEqual([{ email: 'friend@inxt.me' }]);
  });

  test('when a reply is written on several lines, then it travels as markup like any other message', async () => {
    await encryptAndSendReply({ ...reply, text: 'Sure,\n\nsee you there' });

    const encryptedEmail = encryptMock.mock.calls[0][0];
    expect(encryptedEmail.text).toContain('white-space:pre-wrap');
    expect(encryptedEmail.text).toContain('Sure,\n\nsee you there');
  });

  test('when replying to everybody, then the request says so', async () => {
    await encryptAndSendReply({ ...reply, replyAll: true });

    expect(replyRequestBody().replyAll).toBe(true);
  });

  test('when a reply is sent, then it is encrypted and its recipients are wrapped as in any other message', async () => {
    await encryptAndSendReply(reply);

    expect(replyRequestBody().encryption.encryptedText).toBe('text');
    expect(keyAsText(wrappedFor('friend@inxt.me'))).toBe('friend-key');
    expect(keyAsText(wrappedFor(SENDER.address))).toBe('sender-key');
  });

  test('when every recipient of a reply is internal, then it is delivered inside Internxt', async () => {
    await encryptAndSendReply(reply);

    expect(replyRequestBody().deliveryMode).toBe('INTERNXT');
  });

  test('when a reply reaches somebody outside Internxt, then it is delivered externally', async () => {
    getPublicKeysMock.mockResolvedValue([
      { address: 'friend@inxt.me', publicKey: 'friend-key' },
      { address: 'someone@gmail.com', publicKey: null },
    ]);

    await encryptAndSendReply({ ...reply, cc: ['someone@gmail.com'] });

    expect(replyRequestBody().deliveryMode).toBe('EXTERNAL');
  });

  test('when a reply stays inside Internxt and somebody is in blind copy, then it is not sent, because the envelope names them all', async () => {
    await expect(encryptAndSendReply({ ...reply, bcc: ['hidden@inxt.me'] })).rejects.toBeInstanceOf(
      BlindCopyNotDeliverableError,
    );

    expect(getPublicKeysMock).not.toHaveBeenCalled();
    expect(replyEmailMock).not.toHaveBeenCalled();
  });

  test('when a reply has nobody to go to, then it is not sent', async () => {
    await expect(encryptAndSendReply({ ...reply, to: [] })).rejects.toBeInstanceOf(NoRecipientsError);

    expect(replyEmailMock).not.toHaveBeenCalled();
  });
});

describe('Forwarding a message', () => {
  const materializeMock = materializeForwardedAttachments as jest.Mock;
  const discardMock = discardMaterializedAttachments as jest.Mock;
  const uploadAttachmentMock = mailboxService.uploadAttachment as jest.Mock;

  const aReport = { blobId: 'blob-1', name: 'report.pdf', type: 'application/pdf', size: 1024 };
  const aMaterializedReport = {
    attachment: { uri: '/tmp/blob-1-report.pdf', name: 'report.pdf', type: 'application/pdf' },
    path: '/tmp/blob-1-report.pdf',
  };

  const forward = {
    forwardedMessageId: 'original-id',
    note: 'Take a look at this',
    quote: { body: '<p>Quoted original</p>', originalText: 'Quoted original' },
    forwardedAttachments: [],
    areAttachmentsEncrypted: true,
    to: ['friend@inxt.me'],
    subject: 'Fwd: The offer',
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(AppService, 'constants', 'get').mockReturnValue({ SERVER_PUBLIC_KEY });
    getActiveDomainsMock.mockResolvedValue(ACTIVE_DOMAINS);
    getMailAccountKeysMock.mockResolvedValue(SENDER);
    sendEmailMock.mockResolvedValue({ id: 'forwarded-id' });
    getPublicKeysMock.mockResolvedValue([{ address: 'friend@inxt.me', publicKey: 'friend-key' }]);
    materializeMock.mockResolvedValue([]);
    uploadAttachmentMock.mockResolvedValue({
      blobId: 'new-blob',
      name: 'report.pdf',
      type: 'application/pdf',
      size: 1024,
    });
    encryptMock.mockResolvedValue({
      encryptedKeys: [{ encryptedForEmail: 'someone', encryptedKey: 'k', hybridCiphertext: 'c' }],
      encEmail: { encText: 'text', encPreview: 'preview', encAttachmentsSessionKey: 'attachments' },
    });
  });

  test('when a message is forwarded, then it is sent naming the original, so it stays in its thread', async () => {
    await encryptAndSendForward(forward);

    expect(sentBody().inReplyToEmailId).toBe('original-id');
  });

  test('when a message is forwarded, then the quoted original travels below what the user wrote', async () => {
    await encryptAndSendForward(forward);

    const encryptedEmail = encryptMock.mock.calls[0][0];
    expect(encryptedEmail.text).toContain('Take a look at this');
    expect(encryptedEmail.text).toContain('<p>Quoted original</p>');
  });

  test('when the attachments of the original are taken out of it, then they are uploaded again for the new message', async () => {
    materializeMock.mockResolvedValue([aMaterializedReport]);

    await encryptAndSendForward({ ...forward, forwardedAttachments: [aReport] });

    expect(uploadAttachmentMock).toHaveBeenCalledTimes(1);
    expect(sentBody().attachments).toEqual([
      { blobId: 'new-blob', name: 'report.pdf', type: 'application/pdf', size: 1024 },
    ]);
  });

  test('when an attachment of the original cannot be taken out of it, then nothing is sent', async () => {
    materializeMock.mockRejectedValue(new ForwardedAttachmentUnavailableError('report.pdf'));

    await expect(encryptAndSendForward({ ...forward, forwardedAttachments: [aReport] })).rejects.toBeInstanceOf(
      ForwardedAttachmentUnavailableError,
    );
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  test('when a forward is over, then the attachments written in the clear are deleted', async () => {
    materializeMock.mockResolvedValue([aMaterializedReport]);

    await encryptAndSendForward({ ...forward, forwardedAttachments: [aReport] });

    expect(discardMock).toHaveBeenCalledWith([aMaterializedReport]);
  });

  test('when sending a forward fails, then the attachments written in the clear are deleted anyway', async () => {
    materializeMock.mockResolvedValue([aMaterializedReport]);
    sendEmailMock.mockRejectedValue(new Error('the server is unreachable'));

    await expect(encryptAndSendForward({ ...forward, forwardedAttachments: [aReport] })).rejects.toThrow();
    expect(discardMock).toHaveBeenCalledWith([aMaterializedReport]);
  });

  test('when a forward cannot be delivered, then its attachments are never downloaded', async () => {
    await expect(encryptAndSendForward({ ...forward, bcc: ['hidden@inxt.me'] })).rejects.toBeInstanceOf(
      BlindCopyNotDeliverableError,
    );
    expect(materializeMock).not.toHaveBeenCalled();
  });

  test('when a forward has nobody to go to, then it is not sent', async () => {
    await expect(encryptAndSendForward({ ...forward, to: [] })).rejects.toBeInstanceOf(NoRecipientsError);

    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  test('when the original could not be decrypted on this device, then its attachments are asked for anyway and the refusal stops the send', async () => {
    materializeMock.mockRejectedValue(new ForwardedAttachmentsNotDecryptableError());

    await expect(encryptAndSendForward({ ...forward, forwardedAttachments: [aReport] })).rejects.toBeInstanceOf(
      ForwardedAttachmentsNotDecryptableError,
    );
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  test('when the original was never encrypted, then the attachments are taken out of it without asking for a key', async () => {
    materializeMock.mockResolvedValue([aMaterializedReport]);

    await encryptAndSendForward({ ...forward, forwardedAttachments: [aReport], areAttachmentsEncrypted: false });

    expect(materializeMock).toHaveBeenCalledWith(expect.objectContaining({ areAttachmentsEncrypted: false }));
  });

  test('when a forward is being sent, then each step it goes through is told', async () => {
    materializeMock.mockImplementation(async ({ onAttachmentProgress }) => {
      onAttachmentProgress?.(1, 1);
      return [aMaterializedReport];
    });
    const stages: SendStage[] = [];

    await encryptAndSendForward(
      { ...forward, forwardedAttachments: [aReport] },
      { onStage: (stage) => stages.push(stage) },
    );

    expect(stages).toEqual([
      { name: 'downloadingAttachments', current: 1, total: 1 },
      { name: 'uploadingAttachments', current: 1, total: 1 },
      { name: 'sending' },
    ]);
  });

  test('when a message carries several attachments, then the last one is told as the last of them, and not left out', async () => {
    materializeMock.mockResolvedValue([]);
    const stages: SendStage[] = [];

    await encryptAndSendEmail(
      {
        to: ['friend@inxt.me'],
        subject: 'Subject',
        text: 'Body',
        files: [
          { uri: '/tmp/one.pdf', name: 'one.pdf', type: 'application/pdf' },
          { uri: '/tmp/two.pdf', name: 'two.pdf', type: 'application/pdf' },
        ],
      },
      { onStage: (stage) => stages.push(stage) },
    );

    expect(stages).toEqual([
      { name: 'uploadingAttachments', current: 1, total: 2 },
      { name: 'uploadingAttachments', current: 2, total: 2 },
      { name: 'sending' },
    ]);
  });

  test('when a send has nothing to upload, then it is not said to be uploading anything', async () => {
    const stages: SendStage[] = [];

    await encryptAndSendForward(forward, { onStage: (stage) => stages.push(stage) });

    expect(stages).toEqual([{ name: 'sending' }]);
  });
});

describe('Sending a message written in a draft', () => {
  const uploadAttachmentMock = mailboxService.uploadAttachment as jest.Mock;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(AppService, 'constants', 'get').mockReturnValue({ SERVER_PUBLIC_KEY });
    getActiveDomainsMock.mockResolvedValue(ACTIVE_DOMAINS);
    getMailAccountKeysMock.mockResolvedValue(SENDER);
    sendEmailMock.mockResolvedValue({ id: 'sent-id' });
    getPublicKeysMock.mockResolvedValue([{ address: 'friend@inxt.me', publicKey: 'friend-key' }]);
    uploadAttachmentMock.mockResolvedValue({ blobId: 'new-blob', name: 'new.pdf', type: 'application/pdf', size: 20 });
    encryptMock.mockResolvedValue({
      encryptedKeys: [{ encryptedForEmail: 'someone', encryptedKey: 'k', hybridCiphertext: 'c' }],
      encEmail: { encText: 'text', encPreview: 'preview', encAttachmentsSessionKey: 'attachments' },
    });
  });

  test('when a message written in a draft is sent, then the draft is named so the server removes it', async () => {
    await encryptAndSendEmail({ to: ['friend@inxt.me'], subject: 'Subject', text: 'Body', draftId: 'draft-1' });

    expect(sentBody().draftId).toBe('draft-1');
  });

  test('when a message was not written in a draft, then no draft is named', async () => {
    await encryptAndSendEmail({ to: ['friend@inxt.me'], subject: 'Subject', text: 'Body' });

    expect(sentBody()).not.toHaveProperty('draftId');
  });

  test('when the draft already carries attachments, then they travel without being uploaded again and the new ones use the same key', async () => {
    const keptAttachment = { blobId: 'kept-blob', name: 'kept.pdf', type: 'application/pdf', size: 5 };

    await encryptAndSendEmail({
      to: ['friend@inxt.me'],
      subject: 'Subject',
      text: 'Body',
      files: [{ uri: '/tmp/new.pdf', name: 'new.pdf', type: 'application/pdf' }],
      draftAttachments: { attachmentsSessionKey: 'the-draft-key', attachments: [keptAttachment] },
    });

    expect(uploadAttachmentMock).toHaveBeenCalledTimes(1);
    expect(sentBody().attachments).toEqual([
      keptAttachment,
      { blobId: 'new-blob', name: 'new.pdf', type: 'application/pdf', size: 20 },
    ]);
    expect(encryptMock.mock.calls[0][0].attachmentsSessionKey).toEqual(new TextEncoder().encode('the-draft-key'));
  });
});
