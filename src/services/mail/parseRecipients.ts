import isValidEmail from '@internxt/lib/dist/auth/isValidEmail';

export type ParsedRecipients = {
  emails: string[];
  invalid: string[];
};

const ENTRY_SEPARATORS = /[,;\n\r\t]/;

/**
 * Tells whether a character closes the entry being typed, so a field can turn it into a
 * recipient without knowing how the list is written.
 *
 * @param character - The character just typed.
 */
export const isEntryTerminator = (character: string): boolean => ENTRY_SEPARATORS.test(character);

/**
 * Splits a list on commas, semicolons and line breaks, ignoring separators inside quotes or
 * angle brackets.
 *
 * @param value - Text as typed or pasted by the user.
 * @returns One entry per address candidate, still unparsed.
 */
const splitEntries = (value: string): string[] => {
  const entries: string[] = [];
  let currentEntry = '';
  let insideQuotes = false;
  let insideAngles = false;

  for (const character of value) {
    if (character === '"') {
      insideQuotes = !insideQuotes;
    } else if (character === '<' && !insideQuotes) {
      insideAngles = true;
    } else if (character === '>' && !insideQuotes) {
      insideAngles = false;
    }

    if (ENTRY_SEPARATORS.test(character) && !insideQuotes && !insideAngles) {
      entries.push(currentEntry);
      currentEntry = '';
    } else {
      currentEntry += character;
    }
  }
  entries.push(currentEntry);

  return entries;
};

/**
 * Reads the address out of entries like `John Doe <john@doe.com>`, or the entry itself when it
 * is a bare address.
 *
 * @param entry - A single entry from the recipient list.
 * @returns The address, or null when the entry does not hold a valid one.
 */
const extractEmail = (entry: string): string | null => {
  const addressInAngleBrackets = /<([^<>]*)>/.exec(entry);
  const candidate = (addressInAngleBrackets ? addressInAngleBrackets[1] : entry)
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim();

  return isValidEmail(candidate) ? candidate : null;
};

/**
 * Addresses can also be separated by spaces, but only split on them when no part looks like a
 * display name.
 *
 * @param entry - A single entry that may hold several space separated addresses.
 * @returns The addresses it holds, or the entry untouched.
 */
const splitSpacedAddresses = (entry: string): string[] => {
  const parts = entry.trim().split(/\s+/);

  return parts.length > 1 && parts.every((part) => extractEmail(part)) ? parts : [entry];
};

/**
 * Parses a pasted or typed recipient list into unique addresses, keeping whatever could not be
 * read as an address so it can be shown back to the user.
 *
 * @param value - Text as typed or pasted by the user.
 * @returns The addresses found, and the entries that are not addresses.
 */
export const parseRecipients = (value: string): ParsedRecipients => {
  const emails: string[] = [];
  const invalid: string[] = [];
  const seenAddresses = new Set<string>();

  for (const entry of splitEntries(value).flatMap(splitSpacedAddresses)) {
    const trimmedEntry = entry.trim();
    if (!trimmedEntry) {
      continue;
    }

    const email = extractEmail(trimmedEntry);
    if (!email) {
      invalid.push(trimmedEntry);
      continue;
    }

    const normalizedEmail = email.toLowerCase();
    if (seenAddresses.has(normalizedEmail)) {
      continue;
    }

    seenAddresses.add(normalizedEmail);
    emails.push(email);
  }

  return { emails, invalid };
};
