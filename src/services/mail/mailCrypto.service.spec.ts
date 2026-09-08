import * as crypto from 'internxt-crypto';
import strings from '../../../assets/lang/strings';
import AppService from '../AppService';
import { logger } from '../common/logger/logger.service';
import {
  ActiveDomainsUnavailableError,
  BlindCopyNotDeliverableError,
  InternxtRecipientKeyMissingError,
  NoRecipientsError,
  PrimaryRecipientMissingError,
  ServerPublicKeyMissingError,
} from './errors';
import { decryptPreviews, encryptAndSendEmail } from './mailCrypto.service';
import { mailboxService } from './mailbox.service';
import { recipientKeysService } from './recipientKeys.service';

jest.mock('./mailbox.service', () => ({
  mailboxService: {
    getActiveDomains: jest.fn(),
    getMailAccountKeys: jest.fn(),
    sendEmail: jest.fn(),
    uploadAttachment: jest.fn(),
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

jest.mock('internxt-crypto', () => ({
  KeystoreType: { ENCRYPTION: 'encryption' },
  genSymmetricKey: () => new Uint8Array([1, 2, 3]),
  base64ToUint8Array: (value: string) => new TextEncoder().encode(value),
  uint8ArrayToBase64: (value: Uint8Array) => new TextDecoder().decode(value),
  uint8ToUTF8: (value: Uint8Array) => new TextDecoder().decode(value),
  openEncryptionKeystore: jest.fn(),
  decryptSymmetrically: jest.fn(),
  encryptSymmetrically: jest.fn(),
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
