import { fs } from '../FileSystemService';
import { decryptAttachmentData } from './attachmentCrypto';
import { MAX_ATTACHMENT_BYTES } from './attachmentLimits';
import { mailLocalDB } from './database/mailLocalDB';
import {
  AttachmentTooLargeError,
  ForwardedAttachmentUnavailableError,
  ForwardedAttachmentsNotDecryptableError,
} from './errors';
import { discardMaterializedAttachments, materializeForwardedAttachments } from './forwardAttachments';
import { mailboxService } from './mailbox.service';

jest.mock('./mailbox.service', () => ({
  mailboxService: { downloadAttachment: jest.fn() },
}));

jest.mock('./database/mailLocalDB', () => ({
  mailLocalDB: { getCachedEmail: jest.fn() },
}));

jest.mock('./attachmentCrypto', () => ({
  decryptAttachmentData: jest.fn(),
}));

jest.mock('../FileSystemService', () => ({
  AcceptedEncodings: { Base64: 'base64' },
  fs: {
    tmpFilePath: (name: string) => `/tmp/${name}`,
    pathToUri: (path: string) => path,
    createFile: jest.fn(),
    unlinkIfExists: jest.fn(),
  },
}));

jest.mock('internxt-crypto', () => ({
  uint8ArrayToBase64: () => 'the-attachment-in-the-clear',
}));

let nextTemporaryName = 0;
jest.mock('react-native-uuid', () => ({
  __esModule: true,
  default: { v4: () => `temporary-${(nextTemporaryName += 1)}` },
}));

const downloadAttachmentMock = mailboxService.downloadAttachment as jest.Mock;
const getCachedEmailMock = mailLocalDB.getCachedEmail as jest.Mock;
const decryptAttachmentDataMock = decryptAttachmentData as jest.Mock;
const createFileMock = fs.createFile as jest.Mock;
const unlinkIfExistsMock = fs.unlinkIfExists as jest.Mock;

const aReport = { blobId: 'blob-1', name: 'report.pdf', type: 'application/pdf', size: 1024 };
const aPhoto = { blobId: 'blob-2', name: 'photo.jpg', type: 'image/jpeg', size: 2048 };

const takeOutOf = (attachments: (typeof aReport)[], overrides: { areAttachmentsEncrypted?: boolean } = {}) =>
  materializeForwardedAttachments({
    forwardedMessageId: 'message-1',
    attachments,
    areAttachmentsEncrypted: true,
    ...overrides,
  });

describe('Taking the attachments out of a message being forwarded', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    nextTemporaryName = 0;
    downloadAttachmentMock.mockResolvedValue({ data: new ArrayBuffer(8), contentType: 'application/pdf' });
    getCachedEmailMock.mockResolvedValue({ text: 'Body', attachmentsSessionKey: 'the-session-key' });
    decryptAttachmentDataMock.mockResolvedValue(new Uint8Array([1, 2, 3]));
  });

  test('when a message is forwarded, then each of its attachments is decrypted and written to the device', async () => {
    const materialized = await takeOutOf([aReport, aPhoto]);

    expect(materialized.map(({ attachment }) => attachment)).toEqual([
      { uri: '/tmp/temporary-1', name: 'report.pdf', type: 'application/pdf', size: 1024 },
      { uri: '/tmp/temporary-2', name: 'photo.jpg', type: 'image/jpeg', size: 2048 },
    ]);
    expect(createFileMock).toHaveBeenCalledTimes(2);
  });

  test('when two attachments of the original share a name, then each one is written to a file of its own', async () => {
    const anotherReport = { ...aReport, blobId: 'blob-3' };

    const materialized = await takeOutOf([aReport, anotherReport]);

    const paths = materialized.map(({ path }) => path);
    expect(new Set(paths).size).toBe(2);
  });

  test('when the name of an attachment would write outside the temporary directory, then it is not used as the file name', async () => {
    const escaping = { ...aReport, name: '../../escaped.pdf' };

    const [materialized] = await takeOutOf([escaping]);

    expect(materialized.path).not.toContain('..');
    expect(materialized.attachment.name).toBe('../../escaped.pdf');
  });

  test('when the original was encrypted and its key is not on this device, then nothing is downloaded and forwarding fails', async () => {
    getCachedEmailMock.mockResolvedValue(null);

    await expect(takeOutOf([aReport])).rejects.toBeInstanceOf(ForwardedAttachmentsNotDecryptableError);
    expect(downloadAttachmentMock).not.toHaveBeenCalled();
  });

  test('when the attachments of the original were encrypted, then they are decrypted with the key of that message', async () => {
    await takeOutOf([aReport]);

    expect(decryptAttachmentDataMock).toHaveBeenCalledWith(expect.any(Uint8Array), 'the-session-key');
  });

  test('when the original was never encrypted, then its attachments travel as they were downloaded', async () => {
    await takeOutOf([aReport], { areAttachmentsEncrypted: false });

    expect(decryptAttachmentDataMock).not.toHaveBeenCalled();
    expect(createFileMock).toHaveBeenCalledTimes(1);
  });

  test('when the attachments are being prepared, then the one being worked on is told, up to the last', async () => {
    const reported: Array<[number, number]> = [];

    await materializeForwardedAttachments({
      forwardedMessageId: 'message-1',
      attachments: [aReport, aPhoto],
      areAttachmentsEncrypted: true,
      onAttachmentProgress: (current, total) => reported.push([current, total]),
    });

    expect(reported).toEqual([
      [1, 2],
      [2, 2],
    ]);
  });

  test('when an attachment cannot be downloaded, then preparing them fails instead of leaving it out', async () => {
    downloadAttachmentMock.mockRejectedValue(new Error('the server is unreachable'));

    await expect(takeOutOf([aReport])).rejects.toBeInstanceOf(ForwardedAttachmentUnavailableError);
  });

  test('when an attachment fails after another one was written, then the one already written is deleted', async () => {
    downloadAttachmentMock
      .mockResolvedValueOnce({ data: new ArrayBuffer(8), contentType: 'application/pdf' })
      .mockRejectedValueOnce(new Error('the server is unreachable'));

    await expect(takeOutOf([aReport, aPhoto])).rejects.toBeInstanceOf(ForwardedAttachmentUnavailableError);
    expect(unlinkIfExistsMock).toHaveBeenCalledWith('/tmp/temporary-1');
  });

  test('when an attachment fails, then the one that failed is named, so the user knows which', async () => {
    downloadAttachmentMock.mockRejectedValue(new Error('the server is unreachable'));

    await expect(takeOutOf([aReport])).rejects.toMatchObject({ attachmentName: 'report.pdf' });
  });

  test('when an attachment is over the size the server takes, then nothing is downloaded at all', async () => {
    const huge = { ...aPhoto, size: MAX_ATTACHMENT_BYTES + 1 };

    await expect(takeOutOf([aReport, huge])).rejects.toBeInstanceOf(AttachmentTooLargeError);
    expect(downloadAttachmentMock).not.toHaveBeenCalled();
  });
});

describe('Cleaning up the attachments of a forwarded message', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('when a forward is over, then every file that was written in the clear is deleted', async () => {
    await discardMaterializedAttachments([
      { attachment: { uri: '/tmp/blob-1-report.pdf', name: 'report.pdf', type: 'application/pdf' }, path: '/tmp/a' },
      { attachment: { uri: '/tmp/blob-2-photo.jpg', name: 'photo.jpg', type: 'image/jpeg' }, path: '/tmp/b' },
    ]);

    expect(unlinkIfExistsMock).toHaveBeenCalledWith('/tmp/a');
    expect(unlinkIfExistsMock).toHaveBeenCalledWith('/tmp/b');
  });
});
