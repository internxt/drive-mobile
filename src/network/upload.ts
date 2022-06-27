import { getNetwork } from './NetworkFacade';
import { Abortable } from '../types';
import { NetworkCredentials } from './requests';

export interface UploadFileParams {
  notifyProgress?: (progress: number) => void;
  signal?: AbortSignal;
}

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

  const [uploadPromise, abortable] = await network.upload(bucketId, mnemonic, filePath, {
    progress: params.notifyProgress,
  });

  onAbortableReady && onAbortableReady(abortable);

  return uploadPromise;
}
