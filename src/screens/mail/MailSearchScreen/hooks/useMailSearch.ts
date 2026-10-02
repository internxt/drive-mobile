import { EmailListResponse, EmailSummaryResponse } from '@internxt/sdk/dist/mail/types';
import { useCallback, useRef, useState } from 'react';

import { logger } from '@internxt-mobile/services/common/logger/logger.service';
import { describeErrorForLog } from '@internxt-mobile/services/mail/errorDescription';
import { SEARCH_PAGE_SIZE, SearchQuery, mailboxService } from '@internxt-mobile/services/mail/mailbox.service';
import { decryptListedPreviews } from '@internxt-mobile/services/mail/mailCrypto.service';
import { SearchCriteria, buildSearchQuery } from '@internxt-mobile/services/mail/mailSearch';
import { useAppSelector } from '../../../../store/hooks';

export type SearchPhase = 'idle' | 'loading' | 'loaded' | 'failed';

type NextPageStatus = 'idle' | 'loading' | 'failed';

type SearchResults = {
  phase: SearchPhase;
  emails: EmailSummaryResponse[];
  hasMoreMails: boolean;
  isLoadingNextPage: boolean;
  hasNextPageFailed: boolean;
};

const IDLE_RESULTS: SearchResults = {
  phase: 'idle',
  emails: [],
  hasMoreMails: false,
  isLoadingNextPage: false,
  hasNextPageFailed: false,
};

const appendNewEmails = (
  currentEmails: EmailSummaryResponse[],
  newEmails: EmailSummaryResponse[],
): EmailSummaryResponse[] => {
  const currentIds = new Set(currentEmails.map((email) => email.id));
  return [...currentEmails, ...newEmails.filter((email) => !currentIds.has(email.id))];
};

/** Searches every mailbox and pages through the results, ignoring responses to outdated requests. */
export const useMailSearch = () => {
  const mnemonic = useAppSelector((state) => state.auth.user?.mnemonic);
  const [results, setResults] = useState<SearchResults>(IDLE_RESULTS);
  const queryRef = useRef<SearchQuery | null>(null);
  const searchGenerationRef = useRef(0);
  const phaseRef = useRef<SearchPhase>('idle');
  const nextPositionRef = useRef(0);
  const hasMoreMailsRef = useRef(false);
  const nextPageStatusRef = useRef<NextPageStatus>('idle');

  const showResults = useCallback((shownResults: SearchResults) => {
    phaseRef.current = shownResults.phase;
    hasMoreMailsRef.current = shownResults.hasMoreMails;
    setResults(shownResults);
  }, []);

  const fetchPage = useCallback(
    async (query: SearchQuery, page: { position: number; limit?: number }): Promise<EmailListResponse> =>
      decryptListedPreviews(await mailboxService.searchEmails(query, page), mnemonic),
    [mnemonic],
  );

  const loadFirstPage = useCallback(
    async ({ isSilent }: { isSilent: boolean }) => {
      searchGenerationRef.current += 1;
      const generation = searchGenerationRef.current;
      nextPageStatusRef.current = 'idle';
      const query = queryRef.current;
      if (!query) {
        nextPositionRef.current = 0;
        showResults(IDLE_RESULTS);
        return;
      }
      if (!isSilent) {
        nextPositionRef.current = 0;
        showResults({ ...IDLE_RESULTS, phase: 'loading' });
      }
      try {
        const page = await fetchPage(query, {
          position: 0,
          limit: Math.max(nextPositionRef.current, SEARCH_PAGE_SIZE),
        });
        if (generation !== searchGenerationRef.current) {
          return;
        }
        nextPositionRef.current = page.emails.length;
        showResults({ ...IDLE_RESULTS, phase: 'loaded', emails: page.emails, hasMoreMails: page.hasMoreMails });
      } catch (error) {
        if (generation !== searchGenerationRef.current) {
          return;
        }
        logger.error('Failed to search emails', describeErrorForLog(error));
        if (isSilent) {
          setResults((currentResults) => ({ ...currentResults, isLoadingNextPage: false }));
        } else {
          showResults({ ...IDLE_RESULTS, phase: 'failed' });
        }
      }
    },
    [fetchPage, showResults],
  );

  const search = useCallback(
    (criteria: SearchCriteria) => {
      queryRef.current = buildSearchQuery(criteria);
      return loadFirstPage({ isSilent: false });
    },
    [loadFirstPage],
  );

  const retry = useCallback(() => loadFirstPage({ isSilent: false }), [loadFirstPage]);

  const refresh = useCallback(async () => {
    if (phaseRef.current === 'loaded') {
      await loadFirstPage({ isSilent: true });
    }
  }, [loadFirstPage]);

  const fetchNextPage = useCallback(async () => {
    const query = queryRef.current;
    if (!query) {
      return;
    }
    const generation = searchGenerationRef.current;
    nextPageStatusRef.current = 'loading';
    setResults((currentResults) => ({ ...currentResults, isLoadingNextPage: true, hasNextPageFailed: false }));
    try {
      const page = await fetchPage(query, { position: nextPositionRef.current });
      if (generation !== searchGenerationRef.current) {
        return;
      }
      nextPositionRef.current += page.emails.length;
      hasMoreMailsRef.current = page.hasMoreMails;
      nextPageStatusRef.current = 'idle';
      setResults((currentResults) => ({
        ...currentResults,
        emails: appendNewEmails(currentResults.emails, page.emails),
        hasMoreMails: page.hasMoreMails,
        isLoadingNextPage: false,
      }));
    } catch (error) {
      if (generation !== searchGenerationRef.current) {
        return;
      }
      logger.error('Failed to search more emails', describeErrorForLog(error));
      nextPageStatusRef.current = 'failed';
      setResults((currentResults) => ({ ...currentResults, isLoadingNextPage: false, hasNextPageFailed: true }));
    }
  }, [fetchPage]);

  const loadNextPage = useCallback(async () => {
    if (phaseRef.current === 'loaded' && hasMoreMailsRef.current && nextPageStatusRef.current === 'idle') {
      await fetchNextPage();
    }
  }, [fetchNextPage]);

  const retryNextPage = useCallback(async () => {
    if (nextPageStatusRef.current === 'failed') {
      await fetchNextPage();
    }
  }, [fetchNextPage]);

  return { ...results, search, retry, refresh, loadNextPage, retryNextPage };
};
