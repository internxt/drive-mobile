import * as RNFS from '@dr.pogodin/react-native-fs';

import { getErrorStatus } from '../services/common/httpErrorStatus';
import {
  HTTP_BAD_REQUEST,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_REQUEST_TIMEOUT,
  HTTP_TOO_MANY_REQUESTS,
} from '../services/common/httpStatusCodes';
import { retryWithBackoff } from '../services/common/retryWithBackoff';
import {
  AbortError,
  ChunkDownloadHttpError,
  ChunkDownloadIncompleteError,
  ChunkDownloadInterruptedError,
} from './errors';

const CHUNK_RETRY_DELAYS_MS = [1000, 3000, 10000, 30000, 60000];
const CHUNK_RETRY_JITTER_RATIO = 0.5;
const CHUNK_READ_TIMEOUT_MS = 30000;
const CHUNK_PROGRESS_DIVIDER = 5;
const CHUNK_PROGRESS_INTERVAL_MS = 150;

export type ByteRange = { start: number; end: number };

type DownloadChunkParams = {
  url: string;
  range: ByteRange;
  toFile: string;
  signal: AbortSignal;
  onJobStarted: (jobId: number) => void;
  onProgress: (bytesWritten: number) => void;
};

const isRetryableChunkError = (error: unknown): boolean => {
  const status = getErrorStatus(error);
  if (status === undefined) {
    return true;
  }
  return status >= HTTP_INTERNAL_SERVER_ERROR || status === HTTP_REQUEST_TIMEOUT || status === HTTP_TOO_MANY_REQUESTS;
};

const downloadChunkOnce = async ({
  url,
  range,
  toFile,
  signal,
  onJobStarted,
  onProgress,
}: DownloadChunkParams): Promise<void> => {
  if (signal.aborted) {
    throw new AbortError('Download cancelled');
  }

  let rejectStoppedDownload: (error: Error) => void = () => undefined;
  const stoppedDownload = new Promise<never>((_, reject) => {
    rejectStoppedDownload = reject;
  });
  const rejectCancelledDownload = () => rejectStoppedDownload(new AbortError('Download cancelled'));
  signal.addEventListener('abort', rejectCancelledDownload, { once: true });

  const downloadJob = RNFS.downloadFile({
    fromUrl: url,
    toFile,
    discretionary: true,
    cacheable: false,
    readTimeout: CHUNK_READ_TIMEOUT_MS,
    headers: {
      Range: `bytes=${range.start}-${range.end}`,
    },
    progressDivider: CHUNK_PROGRESS_DIVIDER,
    progressInterval: CHUNK_PROGRESS_INTERVAL_MS,
    progress: (progressResult) => onProgress(progressResult.bytesWritten),
    // iOS settles neither way when a dropped download leaves resume data, it only reports it here
    resumable: () => rejectStoppedDownload(new ChunkDownloadInterruptedError()),
  });
  onJobStarted(downloadJob.jobId);

  let downloadResult: RNFS.DownloadResultT;
  try {
    downloadResult = await Promise.race([downloadJob.promise, stoppedDownload]);
  } finally {
    signal.removeEventListener('abort', rejectCancelledDownload);
  }
  if (downloadResult.statusCode >= HTTP_BAD_REQUEST) {
    throw new ChunkDownloadHttpError(downloadResult.statusCode);
  }

  const expectedByteCount = range.end - range.start + 1;
  if (downloadResult.bytesWritten !== expectedByteCount) {
    throw new ChunkDownloadIncompleteError(expectedByteCount, downloadResult.bytesWritten);
  }
};

/**
 * Downloads `range` of `url` into `toFile`. Retries network errors, timeouts, interrupted or incomplete downloads
 * and 408, 429 and 5xx responses with jittered backoff, and stops retrying once `signal` aborts. Throws the last error once
 * the retries run out, and `ChunkDownloadHttpError` at once for any other error status.
 */
export const downloadChunkWithRetry = (params: DownloadChunkParams): Promise<void> =>
  retryWithBackoff(() => downloadChunkOnce(params), {
    delaysMs: CHUNK_RETRY_DELAYS_MS,
    jitterRatio: CHUNK_RETRY_JITTER_RATIO,
    shouldRetry: (error) => !params.signal.aborted && isRetryableChunkError(error),
    context: `[Download] Chunk bytes ${params.range.start}-${params.range.end}`,
    signal: params.signal,
  });
