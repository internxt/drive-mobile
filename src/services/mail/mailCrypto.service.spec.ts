import AppService from '../AppService';
import {
  ActiveDomainsUnavailableError,
  InternxtRecipientKeyMissingError,
  NoRecipientsError,
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

// eslint-disable-next-line @typescript-eslint/no-var-requires
const crypto = require('internxt-crypto');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { logger } = require('../common/logger/logger.service');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const strings = require('../../../assets/lang/strings').default;

const SENDER = { address: 'me@inxt.me', publicKey: 'sender-key' };
const ACTIVE_DOMAINS = [{ domain: 'inxt.me' }];

const getActiveDomainsMock = mailboxService.getActiveDomains as jest.Mock;
const getMailAccountKeysMock = mailboxService.getMailAccountKeys as jest.Mock;
const sendEmailMock = mailboxService.sendEmail as jest.Mock;
const getPublicKeysMock = recipientKeysService.getPublicKeys as jest.Mock;
const encryptMock = crypto.encryptEmailHybridForMultipleRecipients as jest.Mock;

const sentBody = () => sendEmailMock.mock.calls[0][0];

const wrappedFor = (address: string) =>
  encryptMock.mock.calls[0][1].find((r: { email: string }) => r.email === address);

const keyAsText = (recipient: { publicHybridKey: Uint8Array }) => new TextDecoder().decode(recipient.publicHybridKey);

describe('Sending an encrypted email', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    await encryptAndSendEmail(['friend@inxt.me', 'someone@gmail.com'], 'Subject', 'Body');

    expect(keyAsText(wrappedFor('friend@inxt.me'))).toBe('friend-key');
    expect(keyAsText(wrappedFor('someone@gmail.com'))).toBe('test-server-public-key');
  });

  test('when a recipient with an internal domain has no published key, then sending fails instead of delivering an unreadable message', async () => {
    getPublicKeysMock.mockResolvedValue([{ address: 'friend@inxt.me', publicKey: null }]);

    await expect(encryptAndSendEmail(['friend@inxt.me'], 'Subject', 'Body')).rejects.toBeInstanceOf(
      InternxtRecipientKeyMissingError,
    );
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  test('when every recipient is external, then the message is still encrypted', async () => {
    getPublicKeysMock.mockResolvedValue([{ address: 'someone@gmail.com', publicKey: null }]);

    await encryptAndSendEmail(['someone@gmail.com'], 'Subject', 'Body');

    expect(sentBody().encryption.encryptedText).toBe('text');
    expect(sentBody().textBody).toBeUndefined();
  });

  test('when a message is sent, then the sender can decrypt it from the sent folder', async () => {
    getPublicKeysMock.mockResolvedValue([{ address: 'friend@inxt.me', publicKey: 'friend-key' }]);

    await encryptAndSendEmail(['friend@inxt.me'], 'Subject', 'Body');

    expect(keyAsText(wrappedFor(SENDER.address))).toBe('sender-key');
  });

  test('when at least one recipient is external, then the message is sent in external delivery mode', async () => {
    getPublicKeysMock.mockResolvedValue([
      { address: 'friend@inxt.me', publicKey: 'friend-key' },
      { address: 'someone@gmail.com', publicKey: null },
    ]);

    await encryptAndSendEmail(['friend@inxt.me', 'someone@gmail.com'], 'Subject', 'Body');

    expect(sentBody().deliveryMode).toBe('EXTERNAL');
  });

  test('when every recipient has an active domain, then the message is sent in internal delivery mode', async () => {
    getPublicKeysMock.mockResolvedValue([{ address: 'friend@inxt.me', publicKey: 'friend-key' }]);

    await encryptAndSendEmail(['friend@inxt.me'], 'Subject', 'Body');

    expect(sentBody().deliveryMode).toBe('INTERNXT');
  });

  test('when the list of active domains cannot be fetched, then sending is blocked instead of guessing the delivery mode', async () => {
    getActiveDomainsMock.mockRejectedValue(new Error('network down'));

    await expect(encryptAndSendEmail(['friend@inxt.me'], 'Subject', 'Body')).rejects.toBeInstanceOf(
      ActiveDomainsUnavailableError,
    );
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  test('when there is nobody to send the message to, then sending is blocked before any key is requested', async () => {
    await expect(encryptAndSendEmail([], 'Subject', 'Body')).rejects.toBeInstanceOf(NoRecipientsError);

    expect(getPublicKeysMock).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  test('when the server reports no active domains at all, then sending is blocked instead of treating everyone as external', async () => {
    getActiveDomainsMock.mockResolvedValue([]);
    getPublicKeysMock.mockResolvedValue([{ address: 'friend@inxt.me', publicKey: 'friend-key' }]);

    await expect(encryptAndSendEmail(['friend@inxt.me'], 'Subject', 'Body')).rejects.toBeInstanceOf(
      ActiveDomainsUnavailableError,
    );
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  test('when the sender writes to their own address, then only one wrap is built for them', async () => {
    getPublicKeysMock.mockResolvedValue([{ address: SENDER.address, publicKey: 'stale-key' }]);

    await encryptAndSendEmail([SENDER.address], 'Subject', 'Body');

    const wrapsForSender = encryptMock.mock.calls[0][1].filter(
      (recipient: { email: string }) => recipient.email === SENDER.address,
    );
    expect(wrapsForSender).toHaveLength(1);
    expect(keyAsText(wrapsForSender[0])).toBe('sender-key');
  });

  test('when the same recipient is typed twice, then they are only asked for once and appear once in the message', async () => {
    getPublicKeysMock.mockResolvedValue([{ address: 'friend@inxt.me', publicKey: 'friend-key' }]);

    await encryptAndSendEmail(['Friend@inxt.me', 'friend@INXT.me'], 'Subject', 'Body');

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

    await expect(encryptAndSendEmail(['someone@gmail.com'], 'Subject', 'Body')).rejects.toBeInstanceOf(
      ServerPublicKeyMissingError,
    );
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
