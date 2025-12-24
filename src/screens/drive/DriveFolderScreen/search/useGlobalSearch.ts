import storageService from '@internxt-mobile/services/StorageService';
import { SearchResult } from '@internxt-mobile/types/drive/folder';
import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_ITEMS_PER_PAGE = 10;

interface UseGlobalSearchProps {
  debounceMs?: number;
}

export const useGlobalSearch = ({ debounceMs = 300 }: UseGlobalSearchProps = {}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);

  const debounceTimerRef = useRef<number | null>(null);
  const currentRequestRef = useRef<(() => void) | null>(null);
  const currentQueryRef = useRef<string>('');

  const performSearch = useCallback(async (searchQuery: string, offset = 0, isLoadMore = false) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setIsLoading(false);
      setIsLoadingMore(false);
      setHasMore(false);
      return;
    }

    try {
      if (isLoadMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      if (currentRequestRef.current) {
        currentRequestRef.current();
      }

      const searchData = await storageService.searchItems(searchQuery, offset);
      const resultItems: SearchResult[] = Array.isArray(searchData) ? searchData : searchData.data;

      if (isLoadMore) {
        setResults((prevResults) => [...prevResults, ...resultItems]);
      } else {
        setResults(resultItems);
      }

      setHasMore(resultItems.length >= DEFAULT_ITEMS_PER_PAGE);
      setCurrentOffset(offset + resultItems.length);

      currentRequestRef.current = null;
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message);
        if (!isLoadMore) {
          setResults([]);
        }
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  const debouncedSearch = useCallback(
    (searchQuery: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      if (currentRequestRef.current) {
        currentRequestRef.current();
      }

      if (!searchQuery.trim()) {
        setResults([]);
        setIsLoading(false);
        setHasMore(false);
        setCurrentOffset(0);
        return;
      }

      setIsLoading(true);
      currentQueryRef.current = searchQuery;

      debounceTimerRef.current = setTimeout(() => {
        setCurrentOffset(0);
        performSearch(searchQuery, 0, false);
      }, debounceMs);
    },
    [performSearch, debounceMs],
  );

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore && currentQueryRef.current.trim()) {
      performSearch(currentQueryRef.current, currentOffset, true);
    }
  }, [isLoadingMore, hasMore, currentOffset, performSearch]);

  const updateQuery = useCallback(
    (newQuery: string) => {
      setQuery(newQuery);
      debouncedSearch(newQuery);
    },
    [debouncedSearch],
  );

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setError(null);
    setIsLoading(false);
    setIsLoadingMore(false);
    setHasMore(false);
    setCurrentOffset(0);
    currentQueryRef.current = '';

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (currentRequestRef.current) {
      currentRequestRef.current();
    }
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (currentRequestRef.current) {
        currentRequestRef.current();
      }
    };
  }, []);

  return {
    query,
    results,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    updateQuery,
    loadMore,
    clearSearch,
    hasResults: results.length > 0,
    isEmpty: !query.trim() && results.length === 0,
  };
};
