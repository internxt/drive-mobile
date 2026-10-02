import { act, renderHook, waitFor } from '@testing-library/react-native';

import { HTTP_PAYLOAD_TOO_LARGE } from '@internxt-mobile/services/common/httpStatusCodes';
import { logger } from '@internxt-mobile/services/common/logger/logger.service';
import { MAX_ATTACHMENT_BYTES } from '@internxt-mobile/services/mail/attachmentLimits';
import { AttachmentTooLargeError, AttachmentUploadAbortedError } from '@internxt-mobile/services/mail/errors';
import { uploadAttachment } from '@internxt-mobile/services/mail/mailCrypto.service';
import { MailAttachment } from '../../../../types/mail';
import { ATTACHMENT_UPLOAD_TIMEOUT_MS, useComposeAttachments } from './useComposeAttachments';

jest.mock('@internxt-mobile/services/mail/mailCrypto.service', () => ({
  uploadAttachment: jest.fn(),
}));

jest.mock('@internxt-mobile/services/common/logger/logger.service', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

let mockGeneratedKeyCount = 0;
jest.mock('internxt-crypto', () => ({
  genSymmetricKey: () => new Uint8Array([++mockGeneratedKeyCount]),
  uint8ArrayToBase64: (bytes: Uint8Array) => `generated-key-${bytes[0]}`,
  base64ToUint8Array: (value: string) => new TextEncoder().encode(value),
}));

let mockGeneratedIdCount = 0;
jest.mock('react-native-uuid', () => ({
  __esModule: true,
  default: { v4: () => `attachment-${++mockGeneratedIdCount}` },
}));

const uploadAttachmentMock = uploadAttachment as jest.Mock;
const TIME_FOR_ANOTHER_UPLOAD_TO_START_MS = 20;

const aFile = (name: string, size?: number): MailAttachment => ({
  uri: `/files/${name}`,
  name,
  type: 'text/plain',
  size,
});

const uploadedReferenceOf = (name: string) => ({ blobId: `blob-of-${name}`, name, type: 'text/plain', size: 10 });

const keyBytes = (key: string) => new TextEncoder().encode(key);

const giveOtherUploadsTimeToStart = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, TIME_FOR_ANOTHER_UPLOAD_TO_START_MS));
  });

const uploadThatWaitsUntilAborted = (_file: MailAttachment, _key: Uint8Array, abortSignal?: AbortSignal) =>
  new Promise((_resolve, reject) =>
    abortSignal?.addEventListener('abort', () => reject(new AttachmentUploadAbortedError())),
  );

const uploadThatFinishesWhenTold = () => {
  let finishUpload: () => void = () => undefined;
  let failUpload: (error: Error) => void = () => undefined;
  uploadAttachmentMock.mockImplementationOnce(
    (file: MailAttachment) =>
      new Promise((resolve, reject) => {
        finishUpload = () => resolve(uploadedReferenceOf(file.name));
        failUpload = reject;
      }),
  );
  return {
    finish: () => finishUpload(),
    fail: (error: Error = new Error('the server is unreachable')) => failUpload(error),
  };
};

describe('Attaching files to a message being written', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGeneratedIdCount = 0;
    mockGeneratedKeyCount = 0;
    uploadAttachmentMock.mockImplementation(async (file: MailAttachment) => uploadedReferenceOf(file.name));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('when a file is added, then it is uploading until its upload finishes, and then it is uploaded', async () => {
    const controlledUpload = uploadThatFinishesWhenTold();
    const { result } = renderHook(() => useComposeAttachments());

    act(() => {
      result.current.addFiles([aFile('notes.txt')]);
    });
    expect(result.current.attachments[0].status).toBe('uploading');
    expect(result.current.isUploadingAttachments).toBe(true);
    await waitFor(() => expect(uploadAttachmentMock).toHaveBeenCalledTimes(1));

    await act(async () => controlledUpload.finish());

    expect(result.current.attachments[0].status).toBe('uploaded');
    expect(result.current.isUploadingAttachments).toBe(false);
    expect(result.current.uploadedAttachments).toEqual({
      attachmentsSessionKey: 'generated-key-1',
      attachments: [uploadedReferenceOf('notes.txt')],
    });
  });

  test('when files are added at different moments, then all of them are encrypted with the key the message is sent with', async () => {
    const { result } = renderHook(() => useComposeAttachments());

    act(() => {
      result.current.addFiles([aFile('one.txt')]);
    });
    await waitFor(() => expect(result.current.uploadedAttachments.attachments).toHaveLength(1));
    act(() => {
      result.current.addFiles([aFile('two.txt')]);
    });
    await waitFor(() => expect(result.current.uploadedAttachments.attachments).toHaveLength(2));

    const { attachmentsSessionKey } = result.current.uploadedAttachments;
    expect(uploadAttachmentMock.mock.calls[0][1]).toEqual(keyBytes(attachmentsSessionKey));
    expect(uploadAttachmentMock.mock.calls[1][1]).toEqual(keyBytes(attachmentsSessionKey));
  });

  test('when several files are added, then each one starts uploading only after the previous one finished', async () => {
    const firstUpload = uploadThatFinishesWhenTold();
    const { result } = renderHook(() => useComposeAttachments());

    act(() => {
      result.current.addFiles([aFile('one.txt'), aFile('two.txt')]);
    });
    await waitFor(() => expect(uploadAttachmentMock).toHaveBeenCalledTimes(1));
    await giveOtherUploadsTimeToStart();
    expect(uploadAttachmentMock).toHaveBeenCalledTimes(1);

    await act(async () => firstUpload.finish());

    await waitFor(() => expect(result.current.uploadedAttachments.attachments).toHaveLength(2));
    expect(uploadAttachmentMock.mock.calls[1][0].name).toBe('two.txt');
  });

  test('when a file is over the size the server takes, then it is handed back and never uploaded', () => {
    const { result } = renderHook(() => useComposeAttachments());

    let refusedFiles: MailAttachment[] = [];
    act(() => {
      refusedFiles = result.current.addFiles([aFile('huge.zip', MAX_ATTACHMENT_BYTES + 1)]);
    });

    expect(refusedFiles.map((file) => file.name)).toEqual(['huge.zip']);
    expect(result.current.attachments).toEqual([]);
    expect(uploadAttachmentMock).not.toHaveBeenCalled();
  });

  test('when a small file and one over the size are added together, then only the large one is handed back and the small one uploads', async () => {
    const { result } = renderHook(() => useComposeAttachments());

    let refusedFiles: MailAttachment[] = [];
    act(() => {
      refusedFiles = result.current.addFiles([aFile('small.txt', 10), aFile('huge.zip', MAX_ATTACHMENT_BYTES + 1)]);
    });

    expect(refusedFiles.map((file) => file.name)).toEqual(['huge.zip']);
    await waitFor(() =>
      expect(result.current.uploadedAttachments.attachments).toEqual([uploadedReferenceOf('small.txt')]),
    );
  });

  test('when an upload fails, then the file is not sent until it is retried and uploads', async () => {
    const failingUpload = uploadThatFinishesWhenTold();
    const { result } = renderHook(() => useComposeAttachments());

    act(() => {
      result.current.addFiles([aFile('notes.txt')]);
    });
    await waitFor(() => expect(uploadAttachmentMock).toHaveBeenCalledTimes(1));
    await act(async () => failingUpload.fail());

    expect(result.current.attachments[0].status).toBe('failed');
    expect(result.current.failedAttachmentCount).toBe(1);
    expect(result.current.uploadedAttachments.attachments).toEqual([]);

    act(() => result.current.retryAttachment(result.current.attachments[0].id));

    await waitFor(() => expect(result.current.attachments[0].status).toBe('uploaded'));
    expect(result.current.failedAttachmentCount).toBe(0);
    expect(uploadAttachmentMock.mock.calls[1][0].uri).toBe('/files/notes.txt');
  });

  test('when a file turns out to be over the size once it is read, then it is marked as too large and cannot be retried', async () => {
    const tooLargeUpload = uploadThatFinishesWhenTold();
    const { result } = renderHook(() => useComposeAttachments());

    act(() => {
      result.current.addFiles([aFile('unknown-size.zip')]);
    });
    await waitFor(() => expect(uploadAttachmentMock).toHaveBeenCalledTimes(1));
    await act(async () => tooLargeUpload.fail(new AttachmentTooLargeError('unknown-size.zip')));

    expect(result.current.attachments[0]).toMatchObject({ status: 'failed', failure: 'tooLarge' });

    act(() => result.current.retryAttachment(result.current.attachments[0].id));
    await giveOtherUploadsTimeToStart();

    expect(uploadAttachmentMock).toHaveBeenCalledTimes(1);
    expect(result.current.attachments[0]).toMatchObject({ status: 'failed', failure: 'tooLarge' });
  });

  test('when an upload fails, then the log does not name the file', async () => {
    const failingUpload = uploadThatFinishesWhenTold();
    const { result } = renderHook(() => useComposeAttachments());

    act(() => {
      result.current.addFiles([aFile('private-contract.pdf')]);
    });
    await waitFor(() => expect(uploadAttachmentMock).toHaveBeenCalledTimes(1));
    await act(async () => failingUpload.fail(new Error('Could not upload the attachment private-contract.pdf')));

    expect(logger.error).toHaveBeenCalled();
    const loggedText = (logger.error as jest.Mock).mock.calls
      .flat()
      .map((logArgument) =>
        logArgument instanceof Error ? `${logArgument.message} ${logArgument.stack}` : JSON.stringify(logArgument),
      )
      .join(' ');
    expect(loggedText).not.toContain('private-contract.pdf');
  });

  test('when a file is removed while it uploads, then it does not come back once the upload finishes', async () => {
    const controlledUpload = uploadThatFinishesWhenTold();
    const { result } = renderHook(() => useComposeAttachments());

    act(() => {
      result.current.addFiles([aFile('notes.txt')]);
    });
    await waitFor(() => expect(uploadAttachmentMock).toHaveBeenCalledTimes(1));
    act(() => result.current.removeAttachment(result.current.attachments[0].id));
    await act(async () => controlledUpload.finish());

    expect(result.current.attachments).toEqual([]);
    expect(result.current.uploadedAttachments.attachments).toEqual([]);
  });

  test('when a file is removed while it waits for its turn, then it is never uploaded', async () => {
    const firstUpload = uploadThatFinishesWhenTold();
    const { result } = renderHook(() => useComposeAttachments());

    act(() => {
      result.current.addFiles([aFile('one.txt'), aFile('two.txt')]);
    });
    await waitFor(() => expect(uploadAttachmentMock).toHaveBeenCalledTimes(1));
    act(() => result.current.removeAttachment(result.current.attachments[1].id));
    await act(async () => firstUpload.finish());
    await giveOtherUploadsTimeToStart();

    expect(uploadAttachmentMock).toHaveBeenCalledTimes(1);
    expect(result.current.attachments.map((attachment) => attachment.name)).toEqual(['one.txt']);
  });

  test('when the attachments of a draft are loaded, then they count as uploaded and new files use the key of the draft', async () => {
    const { result } = renderHook(() => useComposeAttachments());

    act(() =>
      result.current.loadUploadedAttachments({
        attachmentsSessionKey: 'the-draft-key',
        attachments: [uploadedReferenceOf('kept.txt')],
      }),
    );
    act(() => {
      result.current.addFiles([aFile('new.txt')]);
    });

    await waitFor(() => expect(result.current.uploadedAttachments.attachments).toHaveLength(2));
    expect(result.current.uploadedAttachments.attachmentsSessionKey).toBe('the-draft-key');
    expect(uploadAttachmentMock.mock.calls[0][1]).toEqual(keyBytes('the-draft-key'));
    expect(uploadAttachmentMock).toHaveBeenCalledTimes(1);
  });

  test('when the message is closed before a file started uploading, then that file is never uploaded', async () => {
    const firstUpload = uploadThatFinishesWhenTold();
    const { result, unmount } = renderHook(() => useComposeAttachments());

    act(() => {
      result.current.addFiles([aFile('one.txt'), aFile('two.txt')]);
    });
    await waitFor(() => expect(uploadAttachmentMock).toHaveBeenCalledTimes(1));
    unmount();
    await act(async () => firstUpload.finish());
    await giveOtherUploadsTimeToStart();

    expect(uploadAttachmentMock).toHaveBeenCalledTimes(1);
  });

  test('when the first of several files fails to upload, then the next one still uploads', async () => {
    uploadAttachmentMock.mockRejectedValueOnce(new Error('the server is unreachable'));
    const { result } = renderHook(() => useComposeAttachments());

    act(() => {
      result.current.addFiles([aFile('first.txt'), aFile('second.txt')]);
    });

    await waitFor(() =>
      expect(result.current.uploadedAttachments.attachments).toEqual([uploadedReferenceOf('second.txt')]),
    );
    expect(result.current.attachments[0]).toMatchObject({ name: 'first.txt', status: 'failed' });
  });

  test('when an upload never finishes and its file is removed, then the next file still uploads', async () => {
    uploadAttachmentMock.mockImplementationOnce(uploadThatWaitsUntilAborted);
    const { result } = renderHook(() => useComposeAttachments());

    act(() => {
      result.current.addFiles([aFile('stuck.txt'), aFile('next.txt')]);
    });
    await waitFor(() => expect(uploadAttachmentMock).toHaveBeenCalledTimes(1));
    act(() => result.current.removeAttachment(result.current.attachments[0].id));

    await waitFor(() =>
      expect(result.current.uploadedAttachments.attachments).toEqual([uploadedReferenceOf('next.txt')]),
    );
    expect(result.current.isUploadingAttachments).toBe(false);
  });

  test('when an upload takes longer than allowed, then it is cancelled without an error in the log and can be retried', async () => {
    jest.useFakeTimers();
    uploadAttachmentMock.mockImplementationOnce(uploadThatWaitsUntilAborted);
    const { result } = renderHook(() => useComposeAttachments());

    act(() => {
      result.current.addFiles([aFile('slow.txt')]);
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(ATTACHMENT_UPLOAD_TIMEOUT_MS);
    });

    expect(result.current.attachments[0]).toMatchObject({ status: 'failed', failure: 'notUploaded' });
    expect(logger.warn).toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();

    jest.useRealTimers();
    act(() => result.current.retryAttachment(result.current.attachments[0].id));

    await waitFor(() => expect(result.current.attachments[0].status).toBe('uploaded'));
  });

  test('when a file that already uploaded is removed, then it is no longer part of what is sent', async () => {
    const { result } = renderHook(() => useComposeAttachments());

    act(() => {
      result.current.addFiles([aFile('notes.txt')]);
    });
    await waitFor(() => expect(result.current.uploadedAttachments.attachments).toHaveLength(1));
    act(() => result.current.removeAttachment(result.current.attachments[0].id));

    expect(result.current.uploadedAttachments.attachments).toEqual([]);
  });

  test('when a draft without attachments is loaded, then the files added later use the key of the draft', async () => {
    const { result } = renderHook(() => useComposeAttachments());

    act(() => result.current.loadUploadedAttachments({ attachmentsSessionKey: 'the-draft-key', attachments: [] }));
    act(() => {
      result.current.addFiles([aFile('new.txt')]);
    });

    await waitFor(() => expect(result.current.uploadedAttachments.attachments).toHaveLength(1));
    expect(uploadAttachmentMock.mock.calls[0][1]).toEqual(keyBytes('the-draft-key'));
  });

  test('when a file is removed while it uploads, then nothing is logged as an error', async () => {
    uploadAttachmentMock.mockImplementationOnce(uploadThatWaitsUntilAborted);
    const { result } = renderHook(() => useComposeAttachments());

    act(() => {
      result.current.addFiles([aFile('notes.txt')]);
    });
    await waitFor(() => expect(uploadAttachmentMock).toHaveBeenCalledTimes(1));
    act(() => result.current.removeAttachment(result.current.attachments[0].id));
    await giveOtherUploadsTimeToStart();

    expect(logger.error).not.toHaveBeenCalled();
  });

  test('when the message is closed while a file uploads, then that upload is cancelled', async () => {
    let uploadAbortSignal: AbortSignal | undefined;
    uploadAttachmentMock.mockImplementationOnce((file: MailAttachment, key: Uint8Array, abortSignal?: AbortSignal) => {
      uploadAbortSignal = abortSignal;
      return uploadThatWaitsUntilAborted(file, key, abortSignal);
    });
    const { result, unmount } = renderHook(() => useComposeAttachments());

    act(() => {
      result.current.addFiles([aFile('notes.txt')]);
    });
    await waitFor(() => expect(uploadAttachmentMock).toHaveBeenCalledTimes(1));
    unmount();
    await giveOtherUploadsTimeToStart();

    expect(uploadAbortSignal?.aborted).toBe(true);
    expect(logger.error).not.toHaveBeenCalled();
  });

  test('when an upload ignores its cancellation and its file is removed, then the next file still uploads', async () => {
    uploadAttachmentMock.mockImplementationOnce(() => new Promise(() => undefined));
    const { result } = renderHook(() => useComposeAttachments());

    act(() => {
      result.current.addFiles([aFile('stuck.txt'), aFile('next.txt')]);
    });
    await waitFor(() => expect(uploadAttachmentMock).toHaveBeenCalledTimes(1));
    act(() => result.current.removeAttachment(result.current.attachments[0].id));

    await waitFor(() =>
      expect(result.current.uploadedAttachments.attachments).toEqual([uploadedReferenceOf('next.txt')]),
    );
  });

  test('when the server refuses a file for its size, then it is marked as too large', async () => {
    uploadAttachmentMock.mockRejectedValueOnce(
      Object.assign(new Error('Could not upload'), { cause: { status: HTTP_PAYLOAD_TOO_LARGE } }),
    );
    const { result } = renderHook(() => useComposeAttachments());

    act(() => {
      result.current.addFiles([aFile('almost-too-large.zip')]);
    });

    await waitFor(() => expect(result.current.attachments[0]).toMatchObject({ status: 'failed', failure: 'tooLarge' }));
  });
});
