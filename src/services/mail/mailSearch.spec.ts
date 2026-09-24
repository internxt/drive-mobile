import { EMPTY_SEARCH_CRITERIA, addEmailEntries, buildSearchQuery } from './mailSearch';

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
      }),
    ).toEqual({ text: 'invoice', from: ['ada@inxt.me'], to: ['team@inxt.me'], hasAttachment: true, unread: true });
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
