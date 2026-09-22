type MailDomain = { domain: string };

const normalizeAddress = (address: string): string => address.trim().toLowerCase();

/**
 * Extracts the domain part of an email address.
 *
 * @param address - Email address, in any casing and with surrounding spaces allowed.
 * @returns The lowercased domain, or null when the address has no usable domain part.
 */
export const getDomain = (address: string): string | null => {
  const normalizedAddress = normalizeAddress(address);
  const atIndex = normalizedAddress.lastIndexOf('@');
  if (atIndex < 1 || atIndex === normalizedAddress.length - 1) {
    return null;
  }
  return normalizedAddress.slice(atIndex + 1);
};

/**
 * Tells whether an address belongs to one of the domains the server serves.
 *
 * @param address - Email address to check.
 * @param activeDomains - Domains returned by `GET /email/domains`.
 */
export const isInternxtDomain = (address: string, activeDomains: MailDomain[]): boolean => {
  const domain = getDomain(address);
  if (!domain) {
    return false;
  }
  return activeDomains.some((activeDomain) => activeDomain.domain.trim().toLowerCase() === domain);
};

/**
 * Removes duplicates from a list of addresses, comparing them normalized.
 *
 * @param addresses - Addresses as typed by the user.
 * @returns The normalized addresses, in their original order, without repeats.
 */
export const uniqueEmailAddresses = (addresses: string[]): string[] => {
  const seenAddresses = new Set<string>();
  const uniqueAddresses: string[] = [];
  for (const address of addresses) {
    const normalizedAddress = normalizeAddress(address);
    if (seenAddresses.has(normalizedAddress)) {
      continue;
    }
    seenAddresses.add(normalizedAddress);
    uniqueAddresses.push(normalizedAddress);
  }
  return uniqueAddresses;
};

/**
 * Splits recipients into the ones served by an active domain and the rest.
 *
 * @param recipients - Addresses to classify.
 * @param activeDomains - Domains returned by `GET /email/domains`.
 * @returns The two groups, plus whether every recipient is internal.
 */
export const classifyRecipients = (
  recipients: string[],
  activeDomains: MailDomain[],
): { allInternxt: boolean; internxt: string[]; external: string[] } => {
  const internxtRecipients: string[] = [];
  const externalRecipients: string[] = [];
  for (const recipient of recipients) {
    if (isInternxtDomain(recipient, activeDomains)) {
      internxtRecipients.push(recipient);
    } else {
      externalRecipients.push(recipient);
    }
  }

  return {
    allInternxt: recipients.length > 0 && externalRecipients.length === 0,
    internxt: internxtRecipients,
    external: externalRecipients,
  };
};
