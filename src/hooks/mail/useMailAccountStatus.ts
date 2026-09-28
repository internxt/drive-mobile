import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';

import { isMailNotSetUpError } from '../../services/mail/errorDescription';
import { mailboxService } from '../../services/mail/mailbox.service';

export type MailAccountStatus = 'ready' | 'notSetUp';

/**
 * Asks the server for the mail account keys each time the screen gains focus, until an account is found.
 *
 * @returns `notSetUp` when the server answers that the user has no mail account, and `ready` otherwise,
 * also when the request fails for any other reason or the check is disabled.
 */
export const useMailAccountStatus = ({ isEnabled }: { isEnabled: boolean }): MailAccountStatus => {
  const [accountStatus, setAccountStatus] = useState<MailAccountStatus>('ready');
  const hasFoundAccountRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!isEnabled || hasFoundAccountRef.current) {
        return;
      }
      let isCancelled = false;
      mailboxService.getMailAccountKeys().then(
        () => {
          hasFoundAccountRef.current = true;
          if (!isCancelled) {
            setAccountStatus('ready');
          }
        },
        (error) => {
          if (!isCancelled) {
            setAccountStatus(isMailNotSetUpError(error) ? 'notSetUp' : 'ready');
          }
        },
      );
      return () => {
        isCancelled = true;
      };
    }, [isEnabled]),
  );

  return accountStatus;
};
