import { act, renderHook } from '@testing-library/react-native';

import { EMPTY_SEARCH_CRITERIA } from '@internxt-mobile/services/mail/mailSearch';
import { useSearchFilters } from './useSearchFilters';

const renderFilters = () => {
  const search = jest.fn();
  const view = renderHook(() => useSearchFilters(search));
  return { ...view, search, lastSearch: () => search.mock.calls.at(-1)?.[0] };
};

describe('Narrowing a search with filters', () => {
  test('when a filter is turned on after a search, then the search runs again with the text and the filter', () => {
    const { result, lastSearch } = renderFilters();

    act(() => result.current.submitText('invoice'));
    act(() => result.current.toggleFilter('hasAttachment'));

    expect(lastSearch()).toEqual({ ...EMPTY_SEARCH_CRITERIA, text: 'invoice', hasAttachment: true });
  });

  test('when a filter is turned off, then the search runs again without it', () => {
    const { result, lastSearch } = renderFilters();

    act(() => result.current.submitText('invoice'));
    act(() => result.current.toggleFilter('isUnread'));
    act(() => result.current.toggleFilter('isUnread'));

    expect(lastSearch()).toEqual({ ...EMPTY_SEARCH_CRITERIA, text: 'invoice' });
  });

  test('when only a filter is on, then it is searched without any text', () => {
    const { result, lastSearch } = renderFilters();

    act(() => result.current.toggleFilter('isUnread'));

    expect(lastSearch()).toEqual({ ...EMPTY_SEARCH_CRITERIA, isUnread: true });
  });

  test('when the text is cleared while a filter is on, then the search keeps only the filter', () => {
    const { result, lastSearch } = renderFilters();

    act(() => result.current.submitText('invoice'));
    act(() => result.current.toggleFilter('hasAttachment'));
    act(() => result.current.clearText());

    expect(lastSearch()).toEqual({ ...EMPTY_SEARCH_CRITERIA, hasAttachment: true });
  });

  test('when nothing was sent, then clearing the text searches nothing', () => {
    const { result, search } = renderFilters();

    act(() => result.current.clearText());

    expect(search).not.toHaveBeenCalled();
  });
});

describe('Filtering a search by emails', () => {
  test('when several emails are added and the field is closed, then a single search runs with all of them', () => {
    const { result, search, lastSearch } = renderFilters();

    act(() => result.current.openEmailSearchInput('from'));
    act(() => result.current.changeEmailSearchInput({ emails: ['ada@inxt.me'] }));
    act(() => result.current.changeEmailSearchInput({ pendingText: 'Grace Hopper' }));
    act(() => result.current.closeEmailSearchInput());

    expect(search).toHaveBeenCalledTimes(1);
    expect(lastSearch()).toEqual({ ...EMPTY_SEARCH_CRITERIA, from: ['ada@inxt.me', 'Grace Hopper'] });
  });

  test('when the field is closed without changes, then nothing is searched again', () => {
    const { result, search } = renderFilters();

    act(() => result.current.openEmailSearchInput('to'));
    act(() => result.current.closeEmailSearchInput());

    expect(search).not.toHaveBeenCalled();
  });

  test('when another filter is used while an email field is open, then its emails are kept', () => {
    const { result, lastSearch } = renderFilters();

    act(() => result.current.openEmailSearchInput('from'));
    act(() => result.current.changeEmailSearchInput({ emails: ['ada@inxt.me'] }));
    act(() => result.current.toggleFilter('hasAttachment'));

    expect(result.current.emailsToSearch).toBeNull();
    expect(lastSearch()).toEqual({ ...EMPTY_SEARCH_CRITERIA, from: ['ada@inxt.me'], hasAttachment: true });
  });

  test('when an email filter is cleared, then the search runs again without those emails', () => {
    const { result, lastSearch } = renderFilters();

    act(() => result.current.submitText('invoice'));
    act(() => result.current.openEmailSearchInput('to'));
    act(() => result.current.changeEmailSearchInput({ emails: ['team@inxt.me'] }));
    act(() => result.current.closeEmailSearchInput());
    act(() => result.current.clearEmailSearchInput('to'));

    expect(lastSearch()).toEqual({ ...EMPTY_SEARCH_CRITERIA, text: 'invoice' });
  });
});
