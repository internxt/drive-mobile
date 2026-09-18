import { logger } from '../common/logger/logger.service';
import { mailLocalDB } from './database/mailLocalDB';
import { clearOpenedAttachments } from './mailAttachment.service';
import { recipientKeysService } from './recipientKeys.service';

/**
 * Deletes everything Mail keeps on the device for the current account: the opened attachments and
 * the cached message bodies, both stored already decrypted, and the resolved recipient public keys.
 */
export const clearMailLocalData = async (): Promise<void> => {
  recipientKeysService.clear();
  await clearOpenedAttachments();
  await mailLocalDB.resetDatabase();
  logger.info('Mail local data cleared');
};
