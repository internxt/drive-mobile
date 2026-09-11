import { initialOf } from './MessageAvatar';

describe('The letter that stands for someone in an avatar', () => {
  test('when there is a display name, then it is what the letter comes from', () => {
    expect(initialOf('Alice', 'someone@inxt.eu')).toBe('A');
  });

  test('when there is no display name, then the address is used instead', () => {
    expect(initialOf(undefined, 'someone@inxt.eu')).toBe('S');
  });

  test('when the name is only spaces, then the address is used instead', () => {
    expect(initialOf('   ', 'someone@inxt.eu')).toBe('S');
  });

  test('when the name is written in lowercase, then the letter is shown in uppercase', () => {
    expect(initialOf('alice', 'someone@inxt.eu')).toBe('A');
  });

  test('when the name starts with something that is not a letter, then the first letter is used', () => {
    expect(initialOf('"Alice"', 'someone@inxt.eu')).toBe('A');
  });

  test('when neither the name nor the address hold a letter, then a question mark is shown', () => {
    expect(initialOf(undefined, '...')).toBe('?');
  });
});
