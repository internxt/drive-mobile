import { logger } from '../common/logger/logger.service';
import { mailLocalDB } from './database/mailLocalDB';
import { recipientKeysService } from './recipientKeys.service';

/**
 * Deletes everything Mail keeps on the device for the current account: the cached message bodies,
 * which are stored already decrypted, and the resolved recipient public keys.
 */
export const clearMailLocalData = async (): Promise<void> => {
  recipientKeysService.clear();
  await mailLocalDB.resetDatabase();
  logger.info('Mail local data cleared');
};
