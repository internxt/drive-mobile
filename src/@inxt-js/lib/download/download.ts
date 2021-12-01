import { DownloadProgressCallback, EnvironmentConfig } from '../..';
import { FileObject } from '../../api/FileObject';
import { DOWNLOAD } from '../events';
import { ActionState } from '../../api/actionState';
import { DOWNLOAD_CANCELLED } from '../../api/constants';
import { FileManager } from '../../../lib/fs';

export interface Logger {
  info: (message?: any, ...optionalParams: any[]) => void;
  warn: (message?: any, ...optionalParams: any[]) => void;
  debug: (message?: any, ...optionalParams: any[]) => void;
  error: (message?: any, ...optionalParams: any[]) => void;
}

export function download(
  config: EnvironmentConfig,
  bucketId: string,
  fileId: string,
  progress: DownloadProgressCallback,
  debug: Logger,
  state: ActionState,
  fileManager: FileManager,
): Promise<void> {
  const file = new FileObject(config, bucketId, fileId, debug, fileManager);

  state.on(DOWNLOAD_CANCELLED, () => {
    file.emit(DOWNLOAD_CANCELLED);
  });

  console.log('download - file:', file);
  console.log('download - progress: ', progress);

  return file
    .getInfo()
    .then(() => file.getMirrors())
    .then(() => handleProgress(file, progress))
    .then(() => file.download());
}

function handleProgress(fl: FileObject, progressCb: DownloadProgressCallback) {
  let totalBytesDownloaded = 0;
  let progress = 0;
  const totalBytes = fl.rawShards
    .filter((s) => !s.parity)
    .reduce((a, b) => ({ size: a.size + b.size }), { size: 0 }).size;

  if (totalBytes === 0) {
    throw new Error('Total file size can not be 0');
  }

  fl.on(DOWNLOAD.PROGRESS, (addedBytes: number) => {
    totalBytesDownloaded += addedBytes;
    progress = totalBytesDownloaded / totalBytes;
    progressCb(progress, totalBytesDownloaded, totalBytes);
  });
}
