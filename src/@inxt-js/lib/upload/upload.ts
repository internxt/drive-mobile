import { EnvironmentConfig, UploadFileOptions } from '../..';
import { FileObjectUpload, FileMeta } from '../../api/FileObjectUpload';
import { logger } from '../utils/logger';
import { ActionState } from '../../api/actionState';
import { UPLOAD_CANCELLED } from '../../api/constants';

/**
 * Uploads a file to the network
 * @param config Environment config
 * @param bucketId id whose bucket is going to store the file
 * @param fileMeta file metadata
 * @param progress upload progress callback
 * @param finish finish progress callback
 */
export async function upload(config: EnvironmentConfig, bucketId: string, fileMeta: FileMeta, params: UploadFileOptions, actionState: ActionState): Promise<void> {
  const file = new FileObjectUpload(config, fileMeta, bucketId);

  actionState.on(UPLOAD_CANCELLED, () => {
    file.emit(UPLOAD_CANCELLED);
  });

  await file.init();
  await file.checkBucketExistence();
  await file.stage();
  file.encrypt();

  const uploadResponses = await file.upload(params.progressCallback);

  logger.debug('Upload finished. Creating bucket entry...');

  await file.createBucketEntry(uploadResponses);

  logger.info('Uploaded file with id %s', file.getId());

  params.progressCallback(1, file.getSize(), file.getSize());
  params.finishedCallback(null, file.getId());
}
