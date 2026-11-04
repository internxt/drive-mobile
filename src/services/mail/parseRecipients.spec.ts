import { parseRecipients } from './parseRecipients';

describe('Reading a list of recipients', () => {
  test('when a list separated by commas is typed, then every address becomes its own recipient', () => {
    const { emails, invalid } = parseRecipients('one@inxt.me, two@inxt.me');

    expect(emails).toEqual(['one@inxt.me', 'two@inxt.me']);
    expect(invalid).toEqual([]);
  });

  test('when the addresses are separated by semicolons or line breaks, then they are read the same way', () => {
    const { emails } = parseRecipients('one@inxt.me;two@inxt.me\nthree@inxt.me');

    expect(emails).toEqual(['one@inxt.me', 'two@inxt.me', 'three@inxt.me']);
  });

  test('when an address comes with the name of its owner, then only the address is kept', () => {
    const { emails } = parseRecipients('Ada Lovelace <ada@inxt.me>');

    expect(emails).toEqual(['ada@inxt.me']);
  });

  test('when a name holds a comma inside quotes, then it is not read as a separator', () => {
    const { emails } = parseRecipients('"Lovelace, Ada" <ada@inxt.me>, grace@inxt.me');

    expect(emails).toEqual(['ada@inxt.me', 'grace@inxt.me']);
  });

  test('when a comma appears inside the angle brackets, then it is not read as a separator either', () => {
    const { emails, invalid } = parseRecipients('<ada,lovelace@inxt.me>, grace@inxt.me');

    expect(emails).toEqual(['grace@inxt.me']);
    expect(invalid).toEqual(['<ada,lovelace@inxt.me>']);
  });

  test('when a name is followed by an address without angle brackets, then the whole entry is rejected instead of guessing', () => {
    const { emails, invalid } = parseRecipients('Ada Lovelace ada@inxt.me');

    expect(emails).toEqual([]);
    expect(invalid).toEqual(['Ada Lovelace ada@inxt.me']);
  });

  test('when several addresses are separated only by spaces, then each one becomes a recipient', () => {
    const { emails } = parseRecipients('one@inxt.me two@inxt.me');

    expect(emails).toEqual(['one@inxt.me', 'two@inxt.me']);
  });

  test('when only a name is typed, then its spaces are not read as separators', () => {
    const { emails, invalid } = parseRecipients('Ada Lovelace');

    expect(emails).toEqual([]);
    expect(invalid).toEqual(['Ada Lovelace']);
  });

  test('when something that is not an address is typed, then it is given back so it can be shown to the user', () => {
    const { emails, invalid } = parseRecipients('good@inxt.me, not an address');

    expect(emails).toEqual(['good@inxt.me']);
    expect(invalid).toEqual(['not an address']);
  });

  test('when the same address is typed twice with different casing, then it is kept once', () => {
    const { emails } = parseRecipients('Ada@inxt.me, ada@INXT.me');

    expect(emails).toEqual(['Ada@inxt.me']);
  });

  test('when the list has empty entries between separators, then they are ignored', () => {
    const { emails, invalid } = parseRecipients('one@inxt.me,,  ,two@inxt.me');

    expect(emails).toEqual(['one@inxt.me', 'two@inxt.me']);
    expect(invalid).toEqual([]);
  });
});
