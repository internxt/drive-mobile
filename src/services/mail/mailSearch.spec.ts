import { EMPTY_SEARCH_CRITERIA, addEmailEntries, buildSearchQuery, getDateBounds } from './mailSearch';

describe('Turning what the user asked for into a search', () => {
  test('when nothing is typed and no filter is on, then there is nothing to search', () => {
    expect(buildSearchQuery(EMPTY_SEARCH_CRITERIA)).toBeNull();
  });

  test('when only blank space is typed, then there is nothing to search', () => {
    expect(buildSearchQuery({ ...EMPTY_SEARCH_CRITERIA, text: '   ', from: [' '] })).toBeNull();
  });

  test('when text is typed with spaces around it, then it is searched without them', () => {
    expect(buildSearchQuery({ ...EMPTY_SEARCH_CRITERIA, text: '  invoice  ' })).toEqual({ text: 'invoice' });
  });

  test('when only a filter is on, then it is searched without any text', () => {
    expect(buildSearchQuery({ ...EMPTY_SEARCH_CRITERIA, from: ['ada@inxt.me'] })).toEqual({ from: ['ada@inxt.me'] });
  });

  test('when the attachment and unread filters are off, then they do not narrow the results', () => {
    expect(buildSearchQuery({ ...EMPTY_SEARCH_CRITERIA, text: 'invoice' })).toEqual({ text: 'invoice' });
  });

  test('when every filter is on, then the search narrows by all of them', () => {
    expect(
      buildSearchQuery({
        text: 'invoice',
        from: ['ada@inxt.me'],
        to: ['team@inxt.me'],
        hasAttachment: true,
        isUnread: true,
        date: { preset: 'today' },
      }),
    ).toEqual({
      text: 'invoice',
      from: ['ada@inxt.me'],
      to: ['team@inxt.me'],
      hasAttachment: true,
      unread: true,
      after: expect.any(String),
    });
  });

  test('when only a date is chosen, then it is searched without any text', () => {
    const query = buildSearchQuery({ ...EMPTY_SEARCH_CRITERIA, date: { preset: 'thisYear' } });

    expect(query).toEqual({ after: expect.any(String) });
  });
});

describe('Narrowing a search to a period of time', () => {
  const now = new Date(2026, 8, 24, 15, 30);
  const localDay = (year: number, month: number, day: number) => new Date(year, month, day).toISOString();

  test('when any date is allowed, then the search is not narrowed by date', () => {
    expect(getDateBounds({ preset: 'anyDate' }, now)).toEqual({});
  });

  test('when today is chosen, then the search starts at the beginning of the day', () => {
    expect(getDateBounds({ preset: 'today' }, now)).toEqual({ after: localDay(2026, 8, 24) });
  });

  test('when the last seven days are chosen, then today counts as one of them', () => {
    expect(getDateBounds({ preset: 'last7Days' }, now)).toEqual({ after: localDay(2026, 8, 18) });
  });

  test('when the last thirty days are chosen, then today counts as one of them', () => {
    expect(getDateBounds({ preset: 'last30Days' }, now)).toEqual({ after: localDay(2026, 7, 26) });
  });

  test('when this year is chosen, then the search starts on the first of January', () => {
    expect(getDateBounds({ preset: 'thisYear' }, now)).toEqual({ after: localDay(2026, 0, 1) });
  });

  test('when last year is chosen, then the search covers that whole year and nothing of this one', () => {
    expect(getDateBounds({ preset: 'lastYear' }, now)).toEqual({
      after: localDay(2025, 0, 1),
      before: localDay(2026, 0, 1),
    });
  });

  test('when a range of days is chosen, then both the first and the last day are included', () => {
    const range = {
      preset: 'customRange' as const,
      startDate: new Date(2026, 8, 12, 18),
      endDate: new Date(2026, 8, 20, 9),
    };

    expect(getDateBounds(range, now)).toEqual({ after: localDay(2026, 8, 12), before: localDay(2026, 8, 21) });
  });

  test('when a range of a single day is chosen, then only that day is searched', () => {
    const day = new Date(2026, 8, 12);
    const range = { preset: 'customRange' as const, startDate: day, endDate: day };

    expect(getDateBounds(range, now)).toEqual({ after: localDay(2026, 8, 12), before: localDay(2026, 8, 13) });
  });
});

describe('Adding emails to a search filter', () => {
  test('when a name is typed, then it is added as it is', () => {
    expect(addEmailEntries([], 'Ada Lovelace')).toEqual(['Ada Lovelace']);
  });

  test('when several emails are typed at once, then each one is added', () => {
    expect(addEmailEntries(['ada@inxt.me'], 'grace@inxt.me, Alan Turing')).toEqual([
      'ada@inxt.me',
      'grace@inxt.me',
      'Alan Turing',
    ]);
  });

  test('when an email is already in the filter, then it is not added twice', () => {
    expect(addEmailEntries(['ada@inxt.me'], 'Ada@Inxt.me')).toEqual(['ada@inxt.me']);
  });

  test('when only blank space is typed, then nothing is added', () => {
    expect(addEmailEntries(['ada@inxt.me'], '   ')).toEqual(['ada@inxt.me']);
  });
});
