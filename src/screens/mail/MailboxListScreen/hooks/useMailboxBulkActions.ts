import { EmailResponse, EmailSummaryResponse } from '@internxt/sdk/dist/mail/types';
import { useEffect, useState } from 'react';

import strings from '../../../../../assets/lang/strings';
import asyncStorageService from '../../../../services/AsyncStorageService';
import { logger } from '../../../../services/common/logger/logger.service';
import { describeErrorForLog } from '../../../../services/mail/errorDescription';
import {
  deleteEmailsPermanently,
  moveEmails,
  updateEmailsReadState,
} from '../../../../services/mail/mailCrypto.service';
import { mailboxService } from '../../../../services/mail/mailbox.service';
import { filterMessagesInMailbox, getRestoreMailbox } from '../../../../services/mail/threadMailboxes';
import { notifications } from '../../../../services/NotificationsService';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { mailActions, selectMailboxTypeById } from '../../../../store/slices/mail';
import { AsyncStorageKey } from '../../../../types';
import { MailboxId } from '../../../../types/mail';
import { confirmDeletePermanently } from '../../threadActionMessages';

/**
 * The actions on the conversations selected in a mailbox. Read and unread change the listed emails;
 * moving, restoring and deleting fetch each conversation and change its messages in `mailboxId`. While one
 * action runs, the others are ignored. When some conversations fail, the user is told how many.
 *
 * @param params.onFinished - Called when an action ends, whether or not every conversation went through.
 */
export const useMailboxBulkActions = ({
  mailboxId,
  selectedEmails,
  onFinished,
}: {
  mailboxId: MailboxId;
  selectedEmails: EmailSummaryResponse[];
  onFinished: () => void;
}) => {
  const dispatch = useAppDispatch();
  const mailboxTypeById = useAppSelector(selectMailboxTypeById);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selfAddress, setSelfAddress] = useState('');

  useEffect(() => {
    asyncStorageService.getItem(AsyncStorageKey.MyMailEmailAdress).then((address) => setSelfAddress(address ?? ''));
  }, []);

  const runBulkAction = async (countCompletedConversations: () => Promise<number>) => {
    if (isUpdating || selectedEmails.length === 0) return;
    setIsUpdating(true);
    try {
      const completedConversationCount = await countCompletedConversations();
      const failedConversationCount = selectedEmails.length - completedConversationCount;
      if (failedConversationCount > 0) {
        notifications.error(
          strings.formatString(
            strings.screens.mail.bulkActionFailed,
            failedConversationCount,
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

  const loadMessagesInMailbox = async (email: EmailSummaryResponse) => {
    const thread = await mailboxService.getThread(email.id);
    return filterMessagesInMailbox(thread, mailboxId, mailboxTypeById);
  };

  const runOnSelectedConversations = (changeMessages: (messages: EmailResponse[]) => Promise<string[]>) =>
    runBulkAction(async () => {
      const conversationLoads = await Promise.allSettled(selectedEmails.map(loadMessagesInMailbox));
      const conversations = conversationLoads.flatMap((conversationLoad) => {
        if (conversationLoad.status === 'rejected') {
          logger.error('Failed to load a conversation', describeErrorForLog(conversationLoad.reason));
          return [];
        }
        return [conversationLoad.value];
      });
      const changedMessageIds = new Set(await changeMessages(conversations.flat()));
      return conversations.filter(
        (messages) => messages.length > 0 && messages.every((message) => changedMessageIds.has(message.id)),
      ).length;
    });

  const moveSelectedTo = (destinationOf: (message: EmailResponse) => MailboxId) =>
    runOnSelectedConversations(async (messages) => {
      const completedMoves = await moveEmails(
        messages.map((message) => ({ email: message, toMailboxId: destinationOf(message) })),
      );
      dispatch(mailActions.threadMovedOut({ moves: completedMoves }));
      return completedMoves.map(({ email }) => email.id);
    });

  const moveSelected = (toMailboxId: MailboxId) => moveSelectedTo(() => toMailboxId);

  const restoreSelected = () => moveSelectedTo((message) => getRestoreMailbox(message, selfAddress));

  const confirmAndDeleteSelectedPermanently = () =>
    confirmDeletePermanently(() =>
      runOnSelectedConversations(async (messages) => {
        const deletedEmails = await deleteEmailsPermanently(messages);
        dispatch(mailActions.threadDeleted({ emails: deletedEmails }));
        return deletedEmails.map((email) => email.id);
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
