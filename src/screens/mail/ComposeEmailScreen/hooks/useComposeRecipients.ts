import { useRef, useState } from 'react';

import * as recipientRules from '../utils/composeRecipients';

type ComposeRecipientsState = {
  recipients: recipientRules.RecipientsByField;
  pendingText: recipientRules.PendingRecipientText;
};

/**
 * Holds the recipients of a message being written together with what is typed in each recipient
 * field.
 *
 * @param params - The recipients the message starts with.
 * @param params.to - Main recipients the message starts with.
 * @param params.cc - Recipients in copy the message starts with.
 * @returns The recipients and the typed text of each field, and the actions that change them.
 */
export const useComposeRecipients = ({ to = [], cc = [] }: { to?: string[]; cc?: string[] }) => {
  const [recipientsState, setRecipientsState] = useState<ComposeRecipientsState>(() => ({
    recipients: { to, cc, bcc: [] },
    pendingText: recipientRules.EMPTY_PENDING_RECIPIENT_TEXT,
  }));
  const latestRecipientsStateRef = useRef(recipientsState);

  const updateRecipientsState = (
    stateUpdater: (currentRecipientsState: ComposeRecipientsState) => ComposeRecipientsState,
  ): ComposeRecipientsState => {
    const updatedRecipientsState = stateUpdater(latestRecipientsStateRef.current);
    latestRecipientsStateRef.current = updatedRecipientsState;
    setRecipientsState(updatedRecipientsState);
    return updatedRecipientsState;
  };

  const changePendingText = (field: recipientRules.RecipientField, typedText: string) => {
    updateRecipientsState((currentRecipientsState) => ({
      ...currentRecipientsState,
      pendingText: { ...currentRecipientsState.pendingText, [field]: typedText },
    }));
  };

  const addTypedRecipients = (field: recipientRules.RecipientField, typedText: string) => {
    updateRecipientsState((currentRecipientsState) => {
      const { recipients, remainingText } = recipientRules.addTypedRecipients(
        currentRecipientsState.recipients,
        field,
        typedText,
      );
      return { recipients, pendingText: { ...currentRecipientsState.pendingText, [field]: remainingText } };
    });
  };

  const removeRecipient = (field: recipientRules.RecipientField, address: string) => {
    updateRecipientsState((currentRecipientsState) => ({
      ...currentRecipientsState,
      recipients: {
        ...currentRecipientsState.recipients,
        [field]: currentRecipientsState.recipients[field].filter((recipient) => recipient !== address),
      },
    }));
  };

  const resolveRecipientsForSending = (): {
    recipients: recipientRules.RecipientsByField;
    unreadableRecipientText: string[];
  } => {
    const { recipients, pendingText } = updateRecipientsState((currentRecipientsState) =>
      recipientRules.addEveryTypedRecipient(currentRecipientsState.recipients, currentRecipientsState.pendingText),
    );
    return { recipients, unreadableRecipientText: recipientRules.findUnreadableRecipientText(pendingText) };
  };

  return {
    recipients: recipientsState.recipients,
    pendingText: recipientsState.pendingText,
    changePendingText,
    addTypedRecipients,
    removeRecipient,
    resolveRecipientsForSending,
  };
};
