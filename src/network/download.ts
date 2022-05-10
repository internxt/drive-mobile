import RNFS from 'react-native-fs';

import { getNetwork } from './NetworkFacade';
import { downloadFile as downloadFileV1, LegacyDownloadRequiredError } from '../services/network/download';
import { downloadFile as downloadFileV1Legacy } from '../services/download';
import { constants } from '../services/app';
import { NetworkCredentials } from './requests';
import { FileVersionOneError } from '@internxt/sdk/dist/network/download';
import { FileManager } from '../services/fileSystem';
import { Abortable } from '../types';

export interface DownloadFileParams {
  toPath: string;
  downloadProgressCallback: (progress: number) => void;
  decryptionProgressCallback: (progress: number) => void;
  signal?: AbortSignal;
}

export async function downloadFile(
  fileId: string,
  bucketId: string,
  mnemonic: string,
  creds: NetworkCredentials,
  params: DownloadFileParams,
  onAbortableReady: (abortable: Abortable) => void
): Promise<void> {
  const network = getNetwork(constants.REACT_NATIVE_BRIDGE_URL, creds);

  const [downloadPromise, abortable] = network.download(fileId, bucketId, mnemonic, params);

  onAbortableReady(abortable);

  try {
    await downloadPromise;
  } catch (err) {
    const requiresV1Download = err instanceof FileVersionOneError;

    if (!requiresV1Download) {
      throw err;
    }

    return downloadV1(fileId, bucketId, mnemonic, creds, params, onAbortableReady);
  }
}

async function downloadV1(
  fileId: string,
  bucketId: string,
  mnemonic: string,
  creds: NetworkCredentials,
  params: DownloadFileParams,
  onAbortableReady: (newAbortable: Abortable) => void
): Promise<void> {
  try {
    const res = await downloadFileV1(
      bucketId,
      fileId,
      {
        encryptionKey: mnemonic,
        user: creds.user,
        password: creds.pass,
      },
      constants.REACT_NATIVE_BRIDGE_URL,
      params,
    );

    onAbortableReady(() => RNFS.stopDownload(res.jobId));

    await res.promise;
  } catch (err) {
    const legacyDownloadRequired = err instanceof LegacyDownloadRequiredError;

    if (!legacyDownloadRequired) {
      throw err;
    }

    const fileManager = new FileManager(params.toPath);

    const [legacyAbortable, promise] = downloadFileV1Legacy(
      bucketId,
      {
        user: creds.user,
        password: creds.pass,
        encryptionKey: mnemonic,
      },
      fileId,
      {
        fileManager,
        progressCallback: params.downloadProgressCallback,
      },
    );

    onAbortableReady(legacyAbortable);

    return promise;
  }
}
