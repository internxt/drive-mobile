import { EmailResponse } from '@internxt/sdk/dist/mail/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';

import strings from '../../../../../assets/lang/strings';
import { logger } from '../../../../services/common/logger/logger.service';
import { describeErrorForLog } from '../../../../services/mail/errorDescription';
import {
  deleteEmailsPermanently,
  markEmailRead,
  markEmailUnread,
  moveEmails,
} from '../../../../services/mail/mailCrypto.service';
import { filterMessagesInMailbox, getRestoreMailbox } from '../../../../services/mail/threadMailboxes';
import { notifications } from '../../../../services/NotificationsService';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { loadUnreadCountsThunk, mailActions, selectMailboxTypeById } from '../../../../store/slices/mail';
import { MailboxId } from '../../../../types/mail';

/**
 * Runs the actions on the messages that are in `mailboxId`, and marks the latest of them as read once the
 * mailboxes are known, loading them when they are not. While one action runs, the others are ignored.
 *
 * @param params.onReadStateChanged - Called after a message is marked read or unread on the server.
 * @param params.reloadThread - Called when an action went through for some of the messages but not all.
 * @param params.onFinished - Called when an action went through for every message.
 */
export const useEmailThreadMailboxActions = ({
  messages,
  mailboxId,
  selfAddress,
  onReadStateChanged,
  reloadThread,
  onFinished,
}: {
  messages: EmailResponse[];
  mailboxId: MailboxId;
  selfAddress: string;
  onReadStateChanged: (messageId: string, isRead: boolean) => void;
  reloadThread: () => Promise<void>;
  onFinished: () => void;
}) => {
  const dispatch = useAppDispatch();
  const mailboxTypeById = useAppSelector(selectMailboxTypeById);
  const areMailboxesKnown = Object.keys(mailboxTypeById).length > 0;
  const [isUpdating, setIsUpdating] = useState(false);
  const hasMarkedReadRef = useRef(false);

  const messagesInMailbox = useMemo(
    () => filterMessagesInMailbox(messages, mailboxId, mailboxTypeById),
    [messages, mailboxId, mailboxTypeById],
  );
  const latestMessageInMailbox = messagesInMailbox[messagesInMailbox.length - 1];

  useEffect(() => {
    if (!areMailboxesKnown) {
      dispatch(loadUnreadCountsThunk());
    }
  }, [areMailboxesKnown, dispatch]);

  const updateReadState = useCallback(
    async (message: EmailResponse, isRead: boolean) => {
      await (isRead ? markEmailRead(message.id) : markEmailUnread(message.id));
      dispatch(mailActions.threadReadStateChanged({ emails: [message], isRead }));
      onReadStateChanged(message.id, isRead);
    },
    [dispatch, onReadStateChanged],
  );

  useEffect(() => {
    if (hasMarkedReadRef.current || !latestMessageInMailbox) {
      return;
    }
    hasMarkedReadRef.current = true;
    if (!latestMessageInMailbox.isRead) {
      updateReadState(latestMessageInMailbox, true).catch((error) => {
        logger.error('Failed to mark email as read', describeErrorForLog(error));
      });
    }
  }, [latestMessageInMailbox, updateReadState]);

  const markUnread = async () => {
    if (!latestMessageInMailbox || isUpdating) return;
    setIsUpdating(true);
    try {
      await updateReadState(latestMessageInMailbox, false);
      onFinished();
    } catch (error) {
      logger.error('Failed to mark email unread', describeErrorForLog(error));
      notifications.error(strings.screens.email_detail.markUnreadFailed);
    } finally {
      setIsUpdating(false);
    }
  };

  const runThreadAction = async <Item>(
    items: Item[],
    request: (items: Item[]) => Promise<Item[]>,
    onCompleted: (completedItems: Item[]) => void,
    failureMessage: string,
  ) => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      const completedItems = await request(items);
      onCompleted(completedItems);
      if (completedItems.length < items.length) {
        notifications.error(failureMessage);
        if (completedItems.length > 0) {
          await reloadThread();
        }
        return;
      }
      onFinished();
    } finally {
      setIsUpdating(false);
    }
  };

  const moveMessagesTo = (destinationOf: (message: EmailResponse) => MailboxId) =>
    runThreadAction(
      messagesInMailbox.map((message) => ({ email: message, toMailboxId: destinationOf(message) })),
      moveEmails,
      (completedMoves) => dispatch(mailActions.threadMovedOut({ moves: completedMoves })),
      strings.screens.email_detail.moveFailed,
    );

  const moveThread = (toMailboxId: MailboxId) => moveMessagesTo(() => toMailboxId);

  const restoreThread = () => moveMessagesTo((message) => getRestoreMailbox(message, selfAddress));

  const confirmAndDeleteThreadPermanently = () => {
    const { deleteConfirmation } = strings.screens.email_detail;
    Alert.alert(deleteConfirmation.title, deleteConfirmation.message, [
      { text: strings.buttons.cancel, style: 'cancel' },
      {
        text: deleteConfirmation.confirm,
        style: 'destructive',
        onPress: () =>
          runThreadAction(
            messagesInMailbox,
            deleteEmailsPermanently,
            (deletedEmails) => dispatch(mailActions.threadDeleted({ emails: deletedEmails })),
            strings.screens.email_detail.deleteFailed,
          ),
      },
    ]);
  };

  return { messagesInMailbox, isUpdating, markUnread, moveThread, restoreThread, confirmAndDeleteThreadPermanently };
};
