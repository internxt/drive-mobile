import { clearMailLocalData } from './clearMailLocalData';
import { mailLocalDB } from './database/mailLocalDB';
import { recipientKeysService } from './recipientKeys.service';

jest.mock('./database/mailLocalDB', () => ({ mailLocalDB: { resetDatabase: jest.fn() } }));
jest.mock('./recipientKeys.service', () => ({ recipientKeysService: { clear: jest.fn() } }));
jest.mock('../common/logger/logger.service', () => ({ logger: { info: jest.fn(), error: jest.fn() } }));

describe('Clearing what Mail keeps on the device', () => {
  beforeEach(() => jest.clearAllMocks());

  test('when the mail data is cleared, then the locally cached decrypted messages are deleted', async () => {
    await clearMailLocalData();

    expect(mailLocalDB.resetDatabase).toHaveBeenCalledTimes(1);
  });

  test('when the mail data is cleared, then the resolved recipient keys of the account are forgotten', async () => {
    await clearMailLocalData();

    expect(recipientKeysService.clear).toHaveBeenCalledTimes(1);
  });

  test('when deleting the cached messages fails, then the resolved recipient keys are forgotten anyway', async () => {
    (mailLocalDB.resetDatabase as jest.Mock).mockRejectedValueOnce(new Error('the database could not be deleted'));

    await expect(clearMailLocalData()).rejects.toThrow('the database could not be deleted');

    expect(recipientKeysService.clear).toHaveBeenCalledTimes(1);
  });
});
