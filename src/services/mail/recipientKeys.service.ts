import { RecipientKey } from '@internxt/sdk/dist/mail/types';
import { RecipientKeyLookupFailedError } from './errors';
import { logger } from '../common/logger/logger.service';
import { MailboxService, mailboxService } from './mailbox.service';

const CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry = { publicKey: string | null; expiresAt: number };

const normalizeAddress = (address: string): string => address.trim().toLowerCase();

class RecipientKeysService {
  private readonly mailbox: MailboxService;
  private readonly cache = new Map<string, CacheEntry>();

  constructor(mailbox: MailboxService) {
    this.mailbox = mailbox;
  }

  /**
   * Gets the public key of every address, asking the server only for the ones that
   * are not already cached and still fresh.
   *
   * @param addresses - Addresses to resolve, in any casing.
   * @returns One entry per address, with a null key for the ones the server does not know.
   * @throws RecipientKeyLookupFailedError when the server cannot be reached.
   */
  public async getPublicKeys(addresses: string[]): Promise<RecipientKey[]> {
    const now = Date.now();
    const normalized = addresses.map(normalizeAddress);
    const addressesToFetch = normalized.filter((address) => {
      const cached = this.cache.get(address);
      return !cached || cached.expiresAt <= now;
    });

    if (addressesToFetch.length > 0) {
      let recipients: RecipientKey[];
      try {
        recipients = (await this.mailbox.getRecipientsWithPublicKeys(addressesToFetch)).recipients;
      } catch (error) {
        throw new RecipientKeyLookupFailedError(error);
      }

      const requestedAddresses = new Set(addressesToFetch);
      const answeredAddresses = new Set<string>();
      for (const recipient of recipients) {
        const address = normalizeAddress(recipient.address);
        if (!requestedAddresses.has(address)) {
          logger.warn(`Recipient key lookup answered for an address that was not asked for: ${address}`);
          continue;
        }
        answeredAddresses.add(address);
        this.cache.set(address, { publicKey: recipient.publicKey, expiresAt: now + CACHE_TTL_MS });
      }

      const unansweredAddresses = addressesToFetch.filter((address) => !answeredAddresses.has(address));
      if (unansweredAddresses.length > 0) {
        throw new RecipientKeyLookupFailedError(
          new Error(`The server did not answer for ${unansweredAddresses.length} of the requested addresses`),
        );
      }
    }

    return normalized.map((address) => ({
      address,
      publicKey: this.cache.get(address)?.publicKey ?? null,
    }));
  }

  public clear(): void {
    this.cache.clear();
  }
}

export const recipientKeysService = new RecipientKeysService(mailboxService);
