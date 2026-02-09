/**
 * Legacy Download Entry Point
 *
 * This is the ONLY place that should call the legacy @inxt-js download system.
 *
 * Called when:
 * 1. Modern download fails (FileVersionOneError)
 * 2. V1 download fails (LegacyDownloadRequiredError - mirrors.length > 1)
 *
 * This handles very old files with multiple mirrors (legacy redundancy system).
 *
 */

import FileManager from '../../@inxt-js/api/FileManager';
import { Network } from '../../lib/network';
import { Abortable, NetworkCredentials } from '../../types';

interface DownloadFileParams {
  progressCallback: (progress: number, bytesReceived: number, totalBytes: number) => void;
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
