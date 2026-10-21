import { getPaletteIndex, initialOf } from './avatarInitial';

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

describe('The color an avatar gets from an address', () => {
  const PALETTE_SIZE = 5;

  test('when the same address is seen twice, then it gets the same color both times', () => {
    expect(getPaletteIndex('someone@inxt.eu', PALETTE_SIZE)).toBe(getPaletteIndex('someone@inxt.eu', PALETTE_SIZE));
  });

  test('when the address is written with different case or spaces, then it still gets the same color', () => {
    expect(getPaletteIndex(' Someone@Inxt.eu ', PALETTE_SIZE)).toBe(getPaletteIndex('someone@inxt.eu', PALETTE_SIZE));
  });

  test('when any address is given, then the color is one of the palette', () => {
    const addresses = ['a@inxt.eu', 'someone@inxt.eu', 'another.person@example.com', ''];

    addresses.forEach((address) => {
      const index = getPaletteIndex(address, PALETTE_SIZE);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(PALETTE_SIZE);
    });
  });
});
