import { MailDomain, classifyRecipients, normalizeAddress } from '../../../../services/mail/mailDomain';
import { parseRecipients } from '../../../../services/mail/parseRecipients';

export type RecipientField = 'to' | 'cc' | 'bcc';

export type RecipientsByField = Record<RecipientField, string[]>;

export type PendingRecipientText = Record<RecipientField, string>;

export const RECIPIENT_FIELDS_BY_VISIBILITY: RecipientField[] = ['to', 'cc', 'bcc'];

export const EMPTY_PENDING_RECIPIENT_TEXT: PendingRecipientText = { to: '', cc: '', bcc: '' };

/**
 * Adds addresses to a recipient field, keeping every address in a single field. An address that is
 * already in that field or in a more visible one is left out; one that is in a less visible field
 * leaves it.
 */
export const addRecipients = (
  recipients: RecipientsByField,
  field: RecipientField,
  addresses: string[],
): RecipientsByField => {
  const targetFieldIndex = RECIPIENT_FIELDS_BY_VISIBILITY.indexOf(field);
  const normalizedAddressesAlreadyPlaced = new Set(
    RECIPIENT_FIELDS_BY_VISIBILITY.slice(0, targetFieldIndex + 1)
      .flatMap((sameOrMoreVisibleField) => recipients[sameOrMoreVisibleField])
      .map(normalizeAddress),
  );

  const addedAddresses: string[] = [];
  for (const address of addresses) {
    const normalizedAddress = normalizeAddress(address);
    if (normalizedAddressesAlreadyPlaced.has(normalizedAddress)) {
      continue;
    }
    normalizedAddressesAlreadyPlaced.add(normalizedAddress);
    addedAddresses.push(address);
  }

  const normalizedAddedAddresses = new Set(addedAddresses.map(normalizeAddress));
  const updatedRecipients: RecipientsByField = { ...recipients, [field]: [...recipients[field], ...addedAddresses] };
  for (const lessVisibleField of RECIPIENT_FIELDS_BY_VISIBILITY.slice(targetFieldIndex + 1)) {
    updatedRecipients[lessVisibleField] = recipients[lessVisibleField].filter(
      (address) => !normalizedAddedAddresses.has(normalizeAddress(address)),
    );
  }

  return updatedRecipients;
};

/** Turns what is typed in a recipient field into recipients, leaving typed whatever cannot be read as an address. */
export const addTypedRecipients = (
  recipients: RecipientsByField,
  field: RecipientField,
  typedText: string,
): { recipients: RecipientsByField; remainingText: string } => {
  const { emails, invalid } = parseRecipients(typedText);

  return { recipients: addRecipients(recipients, field, emails), remainingText: invalid.join(', ') };
};

/**
 * Turns what is typed in every recipient field into recipients. An address typed in two fields ends up
 * in the most visible of them.
 */
export const addEveryTypedRecipient = (
  recipients: RecipientsByField,
  pendingText: PendingRecipientText,
): { recipients: RecipientsByField; pendingText: PendingRecipientText } =>
  RECIPIENT_FIELDS_BY_VISIBILITY.reduce(
    (recipientsAndTextSoFar, field) => {
      const { recipients: updatedRecipients, remainingText } = addTypedRecipients(
        recipientsAndTextSoFar.recipients,
        field,
        pendingText[field],
      );
      return {
        recipients: updatedRecipients,
        pendingText: { ...recipientsAndTextSoFar.pendingText, [field]: remainingText },
      };
    },
    { recipients, pendingText: EMPTY_PENDING_RECIPIENT_TEXT },
  );

/**
 * Lists what is still typed in the recipient fields and cannot be read as an address, from the most
 * visible field to the least visible one.
 */
export const findUnreadableRecipientText = (pendingText: PendingRecipientText): string[] =>
  RECIPIENT_FIELDS_BY_VISIBILITY.map((field) => pendingText[field].trim()).filter(
    (unreadableText) => unreadableText.length > 0,
  );

/**
 * Tells whether a message has somebody to go to in its main field, counting an address that is
 * typed there and not yet turned into a recipient.
 */
export const hasMainRecipient = (recipients: RecipientsByField, pendingText: PendingRecipientText): boolean =>
  recipients.to.length > 0 || parseRecipients(pendingText.to).emails.length > 0;

/**
 * Tells whether a message can be sent: it has somebody to go to in its main field, its subject is not
 * blank, and it is not already being sent.
 */
export const canSendMessage = ({
  recipients,
  pendingText,
  subject,
  isSending,
}: {
  recipients: RecipientsByField;
  pendingText: PendingRecipientText;
  subject: string;
  isSending: boolean;
}): boolean => !isSending && subject.trim().length > 0 && hasMainRecipient(recipients, pendingText);

/** Tells whether the copy or blind copy field holds a recipient, or has something other than blank space typed in it. */
export const hasCopyOrBlindCopyRecipients = (
  recipients: RecipientsByField,
  pendingText: PendingRecipientText,
): boolean =>
  recipients.cc.length > 0 ||
  recipients.bcc.length > 0 ||
  pendingText.cc.trim().length > 0 ||
  pendingText.bcc.trim().length > 0;

/**
 * Tells whether a message would travel end-to-end encrypted: every recipient, in any field and
 * including what is still being typed, is on a domain the mail server serves. False while the
 * domains are not known (activeDomains is null) or there is nobody to send the message to.
 */
export const isEndToEndEncrypted = (
  recipients: RecipientsByField,
  pendingText: PendingRecipientText,
  activeDomains: MailDomain[] | null,
): boolean => {
  if (!activeDomains) {
    return false;
  }

  const { recipients: recipientsIncludingTypedAddresses } = addEveryTypedRecipient(recipients, pendingText);
  const addressesInEveryField = RECIPIENT_FIELDS_BY_VISIBILITY.flatMap(
    (field) => recipientsIncludingTypedAddresses[field],
  );

  return classifyRecipients(addressesInEveryField, activeDomains).allInternxt;
};
