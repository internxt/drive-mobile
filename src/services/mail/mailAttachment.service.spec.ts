import { fs } from '../FileSystemService';
import { decryptAttachmentData } from './attachmentCrypto';
import { mailboxService } from './mailbox.service';
import { AttachmentToOpen, clearOpenedAttachments, downloadDecryptAndOpenAttachment } from './mailAttachment.service';

const mockFilesOnDisk = new Map<string, string>();
let mockTemporaryFileCount = 0;

jest.mock('../FileSystemService', () => ({
  AcceptedEncodings: { Base64: 'base64' },
  fs: {
    getCacheDir: () => '/cache',
    tmpFilePath: () => `/tmp/file-${++mockTemporaryFileCount}`,
    exists: jest.fn(async (path: string) => mockFilesOnDisk.has(path)),
    createFile: jest.fn(async (path: string, content: string) => {
      mockFilesOnDisk.set(path, content);
    }),
    ensureDir: jest.fn(async () => undefined),
    moveFile: jest.fn(async (source: string, target: string) => {
      const content = mockFilesOnDisk.get(source);
      if (content === undefined) throw new Error('source does not exist');
      mockFilesOnDisk.delete(source);
      mockFilesOnDisk.set(target, content);
    }),
    unlinkIfExists: jest.fn(async (path: string) => {
      const deletedPaths = [...mockFilesOnDisk.keys()].filter((filePath) => filePath.startsWith(path));
      deletedPaths.forEach((filePath) => mockFilesOnDisk.delete(filePath));
      return deletedPaths.length > 0;
    }),
    pathToUri: (path: string) => `file://${path}`,
    showFileViewer: jest.fn(async () => undefined),
  },
}));

jest.mock('./mailbox.service', () => ({
  mailboxService: { downloadAttachment: jest.fn() },
}));

jest.mock('./attachmentCrypto', () => ({
  decryptAttachmentData: jest.fn(),
}));

jest.mock('internxt-crypto', () => ({
  uint8ArrayToBase64: (bytes: Uint8Array) => new TextDecoder().decode(bytes),
}));

const downloadAttachmentMock = mailboxService.downloadAttachment as jest.Mock;
const decryptAttachmentDataMock = decryptAttachmentData as jest.Mock;
const showFileViewerMock = fs.showFileViewer as jest.Mock;

const anAttachment = (overrides: Partial<AttachmentToOpen> = {}): AttachmentToOpen => ({
  emailId: 'email-1',
  blobId: 'blob-1',
  name: 'report.pdf',
  type: 'application/pdf',
  attachmentsSessionKey: 'session-key',
  ...overrides,
});

const openedFileUri = () => showFileViewerMock.mock.calls[showFileViewerMock.mock.calls.length - 1][0] as string;

describe('Opening a mail attachment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFilesOnDisk.clear();
    downloadAttachmentMock.mockImplementation(async (_emailId: string, blobId: string) => ({
      data: new TextEncoder().encode(`encrypted ${blobId}`).buffer,
      contentType: 'application/pdf',
    }));
    decryptAttachmentDataMock.mockImplementation(async (bytes: Uint8Array) =>
      new TextEncoder().encode(`decrypted ${new TextDecoder().decode(bytes)}`),
    );
  });

  test('when an attachment has not been opened before, then it is downloaded, decrypted and kept for next time', async () => {
    await downloadDecryptAndOpenAttachment(anAttachment());

    expect(downloadAttachmentMock).toHaveBeenCalledTimes(1);
    const openedPath = openedFileUri().replace('file://', '');
    expect(openedPath.startsWith('/cache/mail_attachments/')).toBe(true);
    expect(mockFilesOnDisk.get(openedPath)).toBe('decrypted encrypted blob-1');
  });

  test('when an attachment was already opened, then it opens again without downloading it', async () => {
    await downloadDecryptAndOpenAttachment(anAttachment());
    const firstOpenedUri = openedFileUri();

    await downloadDecryptAndOpenAttachment(anAttachment());

    expect(downloadAttachmentMock).toHaveBeenCalledTimes(1);
    expect(decryptAttachmentDataMock).toHaveBeenCalledTimes(1);
    expect(openedFileUri()).toBe(firstOpenedUri);
  });

  test('when two attachments share a name, then each one opens its own file', async () => {
    await downloadDecryptAndOpenAttachment(anAttachment({ blobId: 'blob-1' }));
    const firstOpenedPath = openedFileUri().replace('file://', '');
    await downloadDecryptAndOpenAttachment(anAttachment({ blobId: 'blob-2' }));
    const secondOpenedPath = openedFileUri().replace('file://', '');

    expect(secondOpenedPath).not.toBe(firstOpenedPath);
    expect(mockFilesOnDisk.get(firstOpenedPath)).toBe('decrypted encrypted blob-1');
    expect(mockFilesOnDisk.get(secondOpenedPath)).toBe('decrypted encrypted blob-2');
  });

  test('when the attachment is not encrypted, then it is kept as it was downloaded', async () => {
    await downloadDecryptAndOpenAttachment(anAttachment({ attachmentsSessionKey: null }));

    expect(decryptAttachmentDataMock).not.toHaveBeenCalled();
    expect(mockFilesOnDisk.get(openedFileUri().replace('file://', ''))).toBe('encrypted blob-1');
  });

  test('when decrypting fails, then nothing is kept for next time and it is downloaded again', async () => {
    decryptAttachmentDataMock.mockRejectedValueOnce(new Error('bad key'));

    await expect(downloadDecryptAndOpenAttachment(anAttachment())).rejects.toThrow('bad key');
    expect(mockFilesOnDisk.size).toBe(0);

    await downloadDecryptAndOpenAttachment(anAttachment());
    expect(downloadAttachmentMock).toHaveBeenCalledTimes(2);
  });

  test('when saving the file fails halfway, then nothing is kept for next time', async () => {
    (fs.moveFile as jest.Mock).mockRejectedValueOnce(new Error('disk full'));

    await expect(downloadDecryptAndOpenAttachment(anAttachment())).rejects.toThrow('disk full');

    expect(mockFilesOnDisk.size).toBe(0);
    expect(showFileViewerMock).not.toHaveBeenCalled();
  });

  test('when the opened attachments are cleared, then none of them is left on the device', async () => {
    await downloadDecryptAndOpenAttachment(anAttachment({ blobId: 'blob-1' }));
    await downloadDecryptAndOpenAttachment(anAttachment({ emailId: 'email-2', blobId: 'blob-2' }));

    await clearOpenedAttachments();

    expect(mockFilesOnDisk.size).toBe(0);
  });
});
