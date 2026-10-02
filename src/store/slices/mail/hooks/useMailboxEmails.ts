import { useCallback, useMemo } from 'react';
import { shallowEqual } from 'react-redux';

import { MailboxId } from '../../../../types/mail';
import { useAppDispatch, useAppSelector } from '../../../hooks';
import {
  loadFirstPageThunk,
  loadNextPageThunk,
  mailActions,
  makeSelectMailboxEmails,
  refreshNewestEmailsThunk,
  selectMailboxList,
} from '../index';

/**
 * The emails of one mailbox, newest first, and the actions that load them.
 *
 * @param mailboxId - The mailbox.
 * @returns The emails, whether the first or a further page is loading or failed, whether the newest emails are
 * being refreshed, and the actions that load the first page, load and retry the next one, and refresh the newest
 * emails.
 */
export const useMailboxEmails = (mailboxId: MailboxId) => {
  const dispatch = useAppDispatch();
  const selectMailboxEmails = useMemo(makeSelectMailboxEmails, []);
  const emails = useAppSelector((state) => selectMailboxEmails(state, mailboxId));
  const { isLoadingFirstPage, isLoadingNextPage, isRefreshingNewestEmails, hasFirstPageFailed, hasNextPageFailed } =
    useAppSelector((state) => {
      const mailboxList = selectMailboxList(state, mailboxId);
      return {
        isLoadingFirstPage: mailboxList.isLoadingFirstPage,
        isLoadingNextPage: mailboxList.isLoadingNextPage,
        isRefreshingNewestEmails: mailboxList.isRefreshingNewestEmails,
        hasFirstPageFailed: mailboxList.hasFirstPageFailed,
        hasNextPageFailed: mailboxList.hasNextPageFailed,
      };
    }, shallowEqual);

  const loadFirstPage = useCallback(async () => {
    await dispatch(loadFirstPageThunk({ mailboxId }));
  }, [dispatch, mailboxId]);

  const loadNextPage = useCallback(async () => {
    await dispatch(loadNextPageThunk({ mailboxId }));
  }, [dispatch, mailboxId]);

  const retryNextPage = useCallback(async () => {
    dispatch(mailActions.nextPageRetryRequested({ mailboxId }));
    await dispatch(loadNextPageThunk({ mailboxId }));
  }, [dispatch, mailboxId]);

  const refreshNewestEmails = useCallback(async () => {
    await dispatch(refreshNewestEmailsThunk({ mailboxId }));
  }, [dispatch, mailboxId]);

  return {
    emails,
    isLoadingFirstPage,
    isLoadingNextPage,
    isRefreshingNewestEmails,
    hasFirstPageFailed,
    hasNextPageFailed,
    loadFirstPage,
    loadNextPage,
    retryNextPage,
    refreshNewestEmails,
  };
};
