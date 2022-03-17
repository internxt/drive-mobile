import { getEnvironmentConfig, Network } from '../lib/network';
import { FileManager } from './fileSystem';

interface DownloadFileParams {
  progressCallback: (progress: number) => void;
  fileManager: FileManager;
}

export async function downloadFile(fileId: string, params: DownloadFileParams): Promise<void> {
  const { bridgeUser, bridgePass, encryptionKey, bucketId } = await getEnvironmentConfig();

  return new Network(bridgeUser, bridgePass, encryptionKey).downloadFile(bucketId, fileId, params);
}
