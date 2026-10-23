import * as RNFS from '@dr.pogodin/react-native-fs';

import {
  HTTP_BAD_REQUEST,
  HTTP_FORBIDDEN,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_NOT_FOUND,
  HTTP_REQUEST_TIMEOUT,
  HTTP_TOO_MANY_REQUESTS,
} from '../services/common/httpStatusCodes';
import { downloadChunkWithRetry } from './downloadChunk';
import { AbortError, ChunkDownloadHttpError } from './errors';

jest.mock('@internxt-mobile/services/common', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@dr.pogodin/react-native-fs', () => ({
  downloadFile: jest.fn(),
}));

const HTTP_PARTIAL_CONTENT = 206;
const HTTP_SERVICE_UNAVAILABLE = 503;
const CHUNK_RANGE = { start: 0, end: 99 };
const CHUNK_BYTE_COUNT = CHUNK_RANGE.end - CHUNK_RANGE.start + 1;
const FIRST_JOB_ID = 7;
const SECOND_JOB_ID = 8;
const RETRY_COUNT = 5;
const FIRST_RETRY_DELAY_MS = 1000;

const mockedDownloadFile = jest.mocked(RNFS.downloadFile);

const answerWith = (statusCode: number, bytesWritten = CHUNK_BYTE_COUNT, jobId = FIRST_JOB_ID) => ({
  jobId,
  promise: Promise.resolve({ jobId, statusCode, bytesWritten }),
});

const failWith = (error: Error, jobId = FIRST_JOB_ID) => ({
  jobId,
  promise: Promise.reject(error),
});

describe('downloading one chunk of a large file', () => {
  let abortController: AbortController;
  let onJobStarted: jest.Mock;
  let onProgress: jest.Mock;

  const startChunkDownload = () =>
    downloadChunkWithRetry({
      url: 'https://storage.test/file',
      range: CHUNK_RANGE,
      toFile: '/tmp/file-chunk-1',
      signal: abortController.signal,
      onJobStarted,
      onProgress,
    });

  const runWhileAdvancingTimers = async (pendingDownload: Promise<void>): Promise<unknown> => {
    const settledDownload = pendingDownload.then(
      () => undefined,
      (error: unknown) => error,
    );
    await jest.runAllTimersAsync();
    return settledDownload;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    mockedDownloadFile.mockReset();
    abortController = new AbortController();
    onJobStarted = jest.fn();
    onProgress = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('when the server answers with the requested bytes, then the chunk is downloaded once with a read timeout', async () => {
    mockedDownloadFile.mockReturnValue(answerWith(HTTP_PARTIAL_CONTENT));

    const error = await runWhileAdvancingTimers(startChunkDownload());

    expect(error).toBeUndefined();
    expect(mockedDownloadFile).toHaveBeenCalledTimes(1);
    expect(mockedDownloadFile.mock.calls[0][0]).toMatchObject({
      headers: { Range: 'bytes=0-99' },
      readTimeout: expect.any(Number),
    });
  });

  test('when the native download reports progress, then the written bytes are passed on', async () => {
    const writtenByteCount = 50;
    mockedDownloadFile.mockImplementation((options) => {
      options.progress?.({ jobId: FIRST_JOB_ID, contentLength: CHUNK_BYTE_COUNT, bytesWritten: writtenByteCount });
      return answerWith(HTTP_PARTIAL_CONTENT);
    });

    await runWhileAdvancingTimers(startChunkDownload());

    expect(onProgress).toHaveBeenCalledWith(writtenByteCount);
  });

  test('when the connection stalls once and then recovers, then the chunk is downloaded again and finishes', async () => {
    mockedDownloadFile
      .mockReturnValueOnce(failWith(new Error('timeout')))
      .mockReturnValue(answerWith(HTTP_PARTIAL_CONTENT));

    const error = await runWhileAdvancingTimers(startChunkDownload());

    expect(error).toBeUndefined();
    expect(mockedDownloadFile).toHaveBeenCalledTimes(2);
  });

  test('when a chunk is tried again, then each new download is reported so it can be stopped', async () => {
    mockedDownloadFile
      .mockReturnValueOnce(failWith(new Error('timeout'), FIRST_JOB_ID))
      .mockReturnValue(answerWith(HTTP_PARTIAL_CONTENT, CHUNK_BYTE_COUNT, SECOND_JOB_ID));

    await runWhileAdvancingTimers(startChunkDownload());

    expect(onJobStarted.mock.calls).toEqual([[FIRST_JOB_ID], [SECOND_JOB_ID]]);
  });

  test('when the connection drops and the system only keeps it to resume later, then the chunk is downloaded again', async () => {
    mockedDownloadFile
      .mockImplementationOnce((options) => {
        options.resumable?.({ jobId: FIRST_JOB_ID });
        return { jobId: FIRST_JOB_ID, promise: new Promise(() => undefined) };
      })
      .mockReturnValue(answerWith(HTTP_PARTIAL_CONTENT));

    const error = await runWhileAdvancingTimers(startChunkDownload());

    expect(error).toBeUndefined();
    expect(mockedDownloadFile).toHaveBeenCalledTimes(2);
  });

  test('when the chunk arrives with fewer or more bytes than requested, then it is downloaded again', async () => {
    mockedDownloadFile
      .mockReturnValueOnce(answerWith(HTTP_PARTIAL_CONTENT, 0))
      .mockReturnValueOnce(answerWith(HTTP_PARTIAL_CONTENT, CHUNK_BYTE_COUNT * 2))
      .mockReturnValue(answerWith(HTTP_PARTIAL_CONTENT));

    const error = await runWhileAdvancingTimers(startChunkDownload());

    expect(error).toBeUndefined();
    expect(mockedDownloadFile).toHaveBeenCalledTimes(3);
  });

  test.each([HTTP_INTERNAL_SERVER_ERROR, HTTP_SERVICE_UNAVAILABLE, HTTP_REQUEST_TIMEOUT, HTTP_TOO_MANY_REQUESTS])(
    'when the server answers with the temporary error %i, then the chunk is downloaded again',
    async (statusCode) => {
      mockedDownloadFile
        .mockReturnValueOnce(answerWith(statusCode, 0))
        .mockReturnValue(answerWith(HTTP_PARTIAL_CONTENT));

      const error = await runWhileAdvancingTimers(startChunkDownload());

      expect(error).toBeUndefined();
      expect(mockedDownloadFile).toHaveBeenCalledTimes(2);
    },
  );

  test.each([HTTP_BAD_REQUEST, HTTP_FORBIDDEN, HTTP_NOT_FOUND])(
    'when the server rejects the request with %i, then it fails at once without trying again',
    async (statusCode) => {
      mockedDownloadFile.mockReturnValue(answerWith(statusCode, 0));

      const error = await runWhileAdvancingTimers(startChunkDownload());

      expect(error).toBeInstanceOf(ChunkDownloadHttpError);
      expect((error as ChunkDownloadHttpError).status).toBe(statusCode);
      expect(mockedDownloadFile).toHaveBeenCalledTimes(1);
    },
  );

  test('when the connection keeps failing, then it gives up after the last retry with that error', async () => {
    const connectionError = new Error('timeout');
    mockedDownloadFile.mockImplementation(() => failWith(connectionError));

    const error = await runWhileAdvancingTimers(startChunkDownload());

    expect(error).toBe(connectionError);
    expect(mockedDownloadFile).toHaveBeenCalledTimes(RETRY_COUNT + 1);
  });

  test('when the download is cancelled while a chunk is downloading, then it fails with that error and does not try again', async () => {
    const stoppedDownloadError = new Error('Download has been aborted');
    mockedDownloadFile.mockImplementation(() => {
      abortController.abort();
      return failWith(stoppedDownloadError);
    });

    const error = await runWhileAdvancingTimers(startChunkDownload());

    expect(error).toBe(stoppedDownloadError);
    expect(mockedDownloadFile).toHaveBeenCalledTimes(1);
  });

  test('when the download is cancelled while the system never answers for the chunk, then it stops at once without trying again', async () => {
    mockedDownloadFile.mockReturnValue({ jobId: FIRST_JOB_ID, promise: new Promise(() => undefined) });

    const settledDownload = startChunkDownload().then(
      () => undefined,
      (error: unknown) => error,
    );
    await jest.advanceTimersByTimeAsync(FIRST_RETRY_DELAY_MS);
    abortController.abort();
    const error = await settledDownload;

    expect(error).toBeInstanceOf(AbortError);
    expect(mockedDownloadFile).toHaveBeenCalledTimes(1);
  });

  test('when the download is cancelled while waiting to try again, then it stops at once without trying again', async () => {
    mockedDownloadFile.mockReturnValue(failWith(new Error('timeout')));

    const settledDownload = startChunkDownload().then(
      () => undefined,
      (error: unknown) => error,
    );
    await jest.advanceTimersByTimeAsync(FIRST_RETRY_DELAY_MS / 2);
    abortController.abort();
    const error = await settledDownload;

    expect(error).toBeInstanceOf(AbortError);
    expect(mockedDownloadFile).toHaveBeenCalledTimes(1);
  });

  test('when the download was cancelled before the chunk starts, then nothing is requested', async () => {
    abortController.abort();

    const error = await runWhileAdvancingTimers(startChunkDownload());

    expect(error).toBeInstanceOf(AbortError);
    expect(mockedDownloadFile).not.toHaveBeenCalled();
  });
});
