import { EmailResponse, EmailSummaryResponse } from '@internxt/sdk/dist/mail/types';
import { useCallback, useEffect, useRef, useState } from 'react';

import strings from '../../../../../assets/lang/strings';
import { logger } from '../../../../services/common/logger/logger.service';
import { describeErrorForLog } from '../../../../services/mail/errorDescription';
import {
  deleteEmailsPermanently,
  markEmailRead,
  markEmailUnread,
  moveEmails,
} from '../../../../services/mail/mailCrypto.service';
import { getRestoreMailbox } from '../../../../services/mail/threadMailboxes';
import { notifications } from '../../../../services/NotificationsService';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { loadUnreadCountsThunk, mailActions, selectMailboxTypeById } from '../../../../store/slices/mail';
import { MailboxId } from '../../../../types/mail';
import { confirmDeletePermanently, getMoveFailedMessage } from '../../threadActionMessages';

type OpenedEmail = Pick<EmailSummaryResponse, 'id' | 'mailboxIds' | 'isRead' | 'isDraft' | 'from' | 'to'> &
  Partial<Pick<EmailResponse, 'cc' | 'bcc'>>;

/**
 * Runs the actions on the opened email, taken from its conversation or else from the summary it was opened with,
 * and marks it as read once the mailboxes are known, loading them when they are not. While one action runs, the
 * others are ignored.
 *
 * @param params.onReadStateChanged - Called after the email is marked read or unread on the server.
 * @param params.onFinished - Called when an action went through.
 */
export const useOpenedEmailActions = ({
  messages,
  openedEmailSummary,
  selfAddress,
  onReadStateChanged,
  onFinished,
}: {
  messages: EmailResponse[];
  openedEmailSummary: OpenedEmail;
  selfAddress: string;
  onReadStateChanged: (messageId: string, isRead: boolean) => void;
  onFinished: () => void;
}) => {
  const dispatch = useAppDispatch();
  const mailboxTypeById = useAppSelector(selectMailboxTypeById);
  const areMailboxesKnown = Object.keys(mailboxTypeById).length > 0;
  const [isUpdating, setIsUpdating] = useState(false);
  const hasMarkedReadRef = useRef(false);

  const openedEmail: OpenedEmail =
    messages.find((message) => message.id === openedEmailSummary.id) ?? openedEmailSummary;

  useEffect(() => {
    if (!areMailboxesKnown) {
      dispatch(loadUnreadCountsThunk());
    }
  }, [areMailboxesKnown, dispatch]);

  const updateReadState = useCallback(
    async (email: OpenedEmail, isRead: boolean) => {
      await (isRead ? markEmailRead(email.id) : markEmailUnread(email.id));
      dispatch(mailActions.threadReadStateChanged({ emails: [email], isRead }));
      onReadStateChanged(email.id, isRead);
    },
    [dispatch, onReadStateChanged],
  );

  useEffect(() => {
    if (hasMarkedReadRef.current || !areMailboxesKnown) {
      return;
    }
    hasMarkedReadRef.current = true;
    if (!openedEmail.isRead) {
      updateReadState(openedEmail, true).catch((error) => {
        logger.error('Failed to mark email as read', describeErrorForLog(error));
      });
    }
  }, [openedEmail, areMailboxesKnown, updateReadState]);

  const markUnread = async () => {
    if (isUpdating) {
      return;
    }
    setIsUpdating(true);
    try {
      await updateReadState(openedEmail, false);
      onFinished();
    } catch (error) {
      logger.error('Failed to mark email unread', describeErrorForLog(error));
      notifications.error(strings.screens.email_detail.markUnreadFailed);
    } finally {
      setIsUpdating(false);
    }
  };

  const runEmailAction = async <Item>(
    item: Item,
    request: (items: Item[]) => Promise<Item[]>,
    onCompleted: (completedItems: Item[]) => void,
    failureMessage: string,
  ) => {
    if (isUpdating) {
      return;
    }
    setIsUpdating(true);
    try {
      const completedItems = await request([item]);
      if (completedItems.length === 0) {
        notifications.error(failureMessage);
        return;
      }
      onCompleted(completedItems);
      onFinished();
    } finally {
      setIsUpdating(false);
    }
  };

  const moveEmailTo = (toMailboxId: MailboxId, failureMessage: string) =>
    runEmailAction(
      { email: openedEmail, toMailboxId },
      moveEmails,
      (completedMoves) => dispatch(mailActions.threadMovedOut({ moves: completedMoves })),
      failureMessage,
    );

  const moveThread = (toMailboxId: MailboxId) => moveEmailTo(toMailboxId, getMoveFailedMessage(toMailboxId));

  const restoreThread = () =>
    moveEmailTo(getRestoreMailbox(openedEmail, selfAddress), strings.screens.email_detail.restoreFailed);

  const confirmAndDeleteThreadPermanently = () =>
    confirmDeletePermanently(() =>
      runEmailAction(
        openedEmail,
        deleteEmailsPermanently,
        (deletedEmails) => dispatch(mailActions.threadDeleted({ emails: deletedEmails })),
        strings.screens.email_detail.deleteFailed,
      ),
    );

  return { isUpdating, markUnread, moveThread, restoreThread, confirmAndDeleteThreadPermanently };
};
