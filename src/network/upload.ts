import * as RNFS from '@dr.pogodin/react-native-fs';
import { Abortable } from '../types';
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

  if (fileSize <= MAX_SIZE_FOR_SINGLE_UPLOAD) {
    const [uploadPromise, abortable] = await network.upload(bucketId, mnemonic, filePath, {
      progress: params.notifyProgress,
    });
    onAbortableReady && onAbortableReady(abortable);
    return uploadPromise;
  }

  const uploadPromise = network.uploadMultipart(bucketId, mnemonic, filePath, {
    partSize: MULTIPART_PART_SIZE,
    uploadingCallback: params.notifyProgress,
    abortController: params.signal,
  });

  return uploadPromise;
}
