import { RecipientKeyLookupFailedError } from './errors';
import { mailboxService } from './mailbox.service';
import { recipientKeysService } from './recipientKeys.service';

jest.mock('./mailbox.service', () => ({
  mailboxService: { getRecipientsWithPublicKeys: jest.fn() },
}));

const lookupMock = mailboxService.getRecipientsWithPublicKeys as jest.Mock;

describe('Recipient keys cache', () => {
  beforeEach(() => {
    recipientKeysService.clear();
    lookupMock.mockReset();
    jest.useRealTimers();
  });

  test('when the same recipient is looked up twice within the cache window, then the server is queried only once', async () => {
    lookupMock.mockResolvedValue({ recipients: [{ address: 'someone@inxt.me', publicKey: 'key' }] });

    await recipientKeysService.getPublicKeys(['someone@inxt.me']);
    const second = await recipientKeysService.getPublicKeys(['someone@inxt.me']);

    expect(lookupMock).toHaveBeenCalledTimes(1);
    expect(second).toEqual([{ address: 'someone@inxt.me', publicKey: 'key' }]);
  });

  test('when the cached entry has expired, then the server is queried again', async () => {
    jest.useFakeTimers();
    lookupMock.mockResolvedValue({ recipients: [{ address: 'someone@inxt.me', publicKey: 'key' }] });

    await recipientKeysService.getPublicKeys(['someone@inxt.me']);
    jest.advanceTimersByTime(5 * 60 * 1000 + 1);
    await recipientKeysService.getPublicKeys(['someone@inxt.me']);

    expect(lookupMock).toHaveBeenCalledTimes(2);
  });

  test('when the same address is written with different capitalisation, then it hits the same cache entry', async () => {
    lookupMock.mockResolvedValue({ recipients: [{ address: 'someone@inxt.me', publicKey: 'key' }] });

    await recipientKeysService.getPublicKeys(['Someone@Inxt.me']);
    await recipientKeysService.getPublicKeys([' someone@inxt.me ']);

    expect(lookupMock).toHaveBeenCalledTimes(1);
  });

  test('when only some of the recipients are cached, then the server is asked for the rest only', async () => {
    lookupMock.mockResolvedValueOnce({ recipients: [{ address: 'a@inxt.me', publicKey: 'key-a' }] });
    await recipientKeysService.getPublicKeys(['a@inxt.me']);

    lookupMock.mockResolvedValueOnce({ recipients: [{ address: 'b@gmail.com', publicKey: null }] });
    const result = await recipientKeysService.getPublicKeys(['a@inxt.me', 'b@gmail.com']);

    expect(lookupMock).toHaveBeenLastCalledWith(['b@gmail.com']);
    expect(result).toEqual([
      { address: 'a@inxt.me', publicKey: 'key-a' },
      { address: 'b@gmail.com', publicKey: null },
    ]);
  });

  test('when the server leaves a requested address out of its answer, then the lookup fails instead of treating it as keyless', async () => {
    lookupMock.mockResolvedValue({ recipients: [{ address: 'a@inxt.me', publicKey: 'key-a' }] });

    await expect(recipientKeysService.getPublicKeys(['a@inxt.me', 'b@inxt.me'])).rejects.toBeInstanceOf(
      RecipientKeyLookupFailedError,
    );
  });

  test('when the server answers for an address that was not asked for, then it is not cached', async () => {
    lookupMock.mockResolvedValue({
      recipients: [
        { address: 'a@inxt.me', publicKey: 'key-a' },
        { address: 'canonical@inxt.me', publicKey: 'key-c' },
      ],
    });
    await recipientKeysService.getPublicKeys(['a@inxt.me']);

    lookupMock.mockResolvedValue({ recipients: [{ address: 'canonical@inxt.me', publicKey: 'key-c' }] });
    await recipientKeysService.getPublicKeys(['canonical@inxt.me']);

    expect(lookupMock).toHaveBeenCalledTimes(2);
  });

  test('when the key lookup cannot reach the server, then the failure is reported as a lookup error', async () => {
    lookupMock.mockRejectedValue(new Error('network down'));

    await expect(recipientKeysService.getPublicKeys(['someone@inxt.me'])).rejects.toBeInstanceOf(
      RecipientKeyLookupFailedError,
    );
  });
});
