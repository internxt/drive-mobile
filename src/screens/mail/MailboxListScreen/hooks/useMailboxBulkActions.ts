import { EmailSummaryResponse } from '@internxt/sdk/dist/mail/types';
import { useEffect, useState } from 'react';

import strings from '../../../../../assets/lang/strings';
import asyncStorageService from '../../../../services/AsyncStorageService';
import {
  deleteEmailsPermanently,
  moveEmails,
  updateEmailsReadState,
} from '../../../../services/mail/mailCrypto.service';
import { getRestoreMailbox } from '../../../../services/mail/threadMailboxes';
import { notifications } from '../../../../services/NotificationsService';
import { useAppDispatch } from '../../../../store/hooks';
import { mailActions } from '../../../../store/slices/mail';
import { AsyncStorageKey } from '../../../../types';
import { MailboxId } from '../../../../types/mail';
import { confirmDeletePermanently } from '../../threadActionMessages';

/**
 * The actions on the emails selected in a mailbox. While one action runs, the others are ignored. When some
 * emails fail, the user is told how many.
 *
 * @param params.onFinished - Called when an action ends, whether or not every email went through.
 */
export const useMailboxBulkActions = ({
  selectedEmails,
  onFinished,
}: {
  selectedEmails: EmailSummaryResponse[];
  onFinished: () => void;
}) => {
  const dispatch = useAppDispatch();
  const [isUpdating, setIsUpdating] = useState(false);
  const [selfAddress, setSelfAddress] = useState('');

  useEffect(() => {
    asyncStorageService.getItem(AsyncStorageKey.MyMailEmailAdress).then((address) => setSelfAddress(address ?? ''));
  }, []);

  const runBulkAction = async (countCompletedEmails: () => Promise<number>) => {
    if (isUpdating || selectedEmails.length === 0) {
      return;
    }
    setIsUpdating(true);
    try {
      const completedEmailCount = await countCompletedEmails();
      const failedEmailCount = selectedEmails.length - completedEmailCount;
      if (failedEmailCount > 0) {
        notifications.error(
          strings.formatString(
            strings.screens.mail.bulkActionFailed,
            failedEmailCount,
            selectedEmails.length,
          ) as string,
        );
      }
      onFinished();
    } finally {
      setIsUpdating(false);
    }
  };

  const updateSelectedReadState = (isRead: boolean) =>
    runBulkAction(async () => {
      const emailsToChange = selectedEmails.filter((email) => email.isRead !== isRead);
      const changedEmails = await updateEmailsReadState(emailsToChange, isRead);
      dispatch(mailActions.threadReadStateChanged({ emails: changedEmails, isRead }));
      return selectedEmails.length - (emailsToChange.length - changedEmails.length);
    });

  const moveSelectedTo = (destinationOf: (email: EmailSummaryResponse) => MailboxId) =>
    runBulkAction(async () => {
      const moves = selectedEmails.map((email) => ({ email, toMailboxId: destinationOf(email) }));
      const completedMoves = await moveEmails(moves);
      dispatch(mailActions.threadMovedOut({ moves: completedMoves }));
      return completedMoves.length;
    });

  const moveSelected = (toMailboxId: MailboxId) => moveSelectedTo(() => toMailboxId);

  const restoreSelected = () => moveSelectedTo((email) => getRestoreMailbox(email, selfAddress));

  const confirmAndDeleteSelectedPermanently = () =>
    confirmDeletePermanently(() =>
      runBulkAction(async () => {
        const deletedEmails = await deleteEmailsPermanently(selectedEmails);
        dispatch(mailActions.threadDeleted({ emails: deletedEmails }));
        return deletedEmails.length;
      }),
    );

  return {
    isUpdating,
    markSelectedRead: () => updateSelectedReadState(true),
    markSelectedUnread: () => updateSelectedReadState(false),
    moveSelected,
    restoreSelected,
    confirmAndDeleteSelectedPermanently,
  };
};
