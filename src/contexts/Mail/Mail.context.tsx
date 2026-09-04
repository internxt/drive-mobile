import { MailboxResponse } from '@internxt/sdk/dist/mail/types';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { mailboxService } from '../../services/mail/mailbox.service';
import { MailboxId } from '../../types/mail';

type UnreadByMailbox = Partial<Record<MailboxId, number>>;

export interface MailContextValue {
  unreadByMailbox: UnreadByMailbox;
  /** Re-fetches the mailboxes and their unread counts. Callers own the failure */
  refreshMailboxes: () => Promise<void>;
}

const MailContext = createContext<MailContextValue | undefined>(undefined);

/**
 * Gives access to the mailbox metadata shared by the mail drawer and the mailbox screens.
 * Throws when used outside of MailContextProvider.
 */
export const useMail = (): MailContextValue => {
  const context = useContext(MailContext);
  if (!context) {
    throw new Error('useMail must be used within a MailContextProvider');
  }
  return context;
};

const toUnreadByMailbox = (mailboxes: MailboxResponse[]): UnreadByMailbox =>
  mailboxes.reduce<UnreadByMailbox>((counts, mailbox) => {
    if (mailbox.type) {
      counts[mailbox.type as MailboxId] = mailbox.unreadEmails;
    }
    return counts;
  }, {});

export const MailContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [unreadByMailbox, setUnreadByMailbox] = useState<UnreadByMailbox>({});

  const refreshMailboxes = useCallback(async () => {
    const mailboxes = await mailboxService.getMailboxes();
    setUnreadByMailbox(toUnreadByMailbox(mailboxes));
  }, []);

  const value = useMemo(() => ({ unreadByMailbox, refreshMailboxes }), [unreadByMailbox, refreshMailboxes]);

  return <MailContext.Provider value={value}>{children}</MailContext.Provider>;
};
