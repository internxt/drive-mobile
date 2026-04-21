import * as RNFS from '@dr.pogodin/react-native-fs';
import { logger } from '../services/common';
import { withRateLimitRetry } from '../services/common/rate-limit';
import { Abortable } from '../types';
import { AbortError } from './errors';
import { getNetwork } from './NetworkFacade';
import { NetworkCredentials } from './requests';

export interface UploadFileParams {
  notifyProgress?: (progress: number) => void;
  signal?: AbortSignal;
}

const MAX_SIZE_FOR_SINGLE_UPLOAD = 100 * 1024 * 1024;
const MULTIPART_PART_SIZE = 30 * 1024 * 1024;

export async function uploadFile(
  filePath: string,
  bucketId: string,
  mnemonic: string,
  apiUrl: string,
  creds: NetworkCredentials,
  params: UploadFileParams,
  onAbortableReady?: (abortable: Abortable) => void,
): Promise<string> {
  const network = getNetwork(apiUrl, creds);
  const stat = await RNFS.stat(filePath);
  const fileSize = stat.size;

  const useMultipart = fileSize > MAX_SIZE_FOR_SINGLE_UPLOAD;

  const isAborted = () => params.signal?.aborted === true;

  async function retryUpload(): Promise<string> {
    const MAX_TRIES = 3;
    const RETRY_DELAY = 1000;
    let lastTryError;

    for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
      try {
        const result = await withRateLimitRetry(async () => {
          if (isAborted()) throw new AbortError();

          if (useMultipart) {
            return network.uploadMultipart(bucketId, mnemonic, filePath, {
              partSize: MULTIPART_PART_SIZE,
              uploadingCallback: params.notifyProgress,
              abortController: params.signal,
            });
          }

          const [promise, abortable] = await network.upload(bucketId, mnemonic, filePath, {
            progress: params.notifyProgress,
          });

          if (onAbortableReady) {
            onAbortableReady(abortable);
          }

          params.signal?.addEventListener('abort', () => abortable(), { once: true });
          if (isAborted()) abortable();

          return promise;
        }, 'Upload');

        return result;
      } catch (err) {
        if ((err as Error)?.name === AbortError.errorName) throw err;

        logger.error(`Upload attempt ${attempt} of ${MAX_TRIES} failed:`, err);

        const lastTryFailed = attempt === MAX_TRIES;

        if (lastTryFailed) {
          lastTryError = err;
        } else {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        }
      }
    }

    throw lastTryError;
  }

  return retryUpload();
}
