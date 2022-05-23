import FileManager from '../../@inxt-js/api/FileManager';
import { Network } from '../../lib/network';
import { Abortable, NetworkCredentials } from '../../types';

interface DownloadFileParams {
  progressCallback: (progress: number) => void;
  fileManager: FileManager;
}

export function downloadFile(
  bucketId: string,
  networkCredentials: NetworkCredentials,
  fileId: string,
  params: DownloadFileParams,
): [Abortable, Promise<void>] {
  return new Network(
    networkCredentials.user,
    networkCredentials.password,
    networkCredentials.encryptionKey,
  ).downloadFile(bucketId, fileId, params);
}
