import {
  getBurstMemberPlainName,
  getRepresentativePlainNameFromMember,
  isBurstMemberPlainName,
} from './burst.constants';

describe('burst member plain name helpers', () => {
  describe('when building a member plain name', () => {
    test('when given a base name and index, then it returns the expected dot-separated member name', () => {
      expect(getBurstMemberPlainName('IMG_1234', 0)).toBe('IMG_1234.burst.0');
      expect(getBurstMemberPlainName('IMG_1234', 5)).toBe('IMG_1234.burst.5');
    });

    test('when given a name with mixed casing, then the base is preserved unchanged', () => {
      expect(getBurstMemberPlainName('MyPhoto', 2)).toBe('MyPhoto.burst.2');
    });
  });

  describe('when detecting whether a plain name belongs to a burst member', () => {
    test('when the name ends with the burst infix and an index, then it is detected as a member', () => {
      expect(isBurstMemberPlainName('IMG_1234.burst.0')).toBe(true);
      expect(isBurstMemberPlainName('IMG_1234.burst.99')).toBe(true);
    });

    test('when the name is the representative or an unrelated name, then it is not detected as a member', () => {
      expect(isBurstMemberPlainName('IMG_1234')).toBe(false);
      expect(isBurstMemberPlainName('IMG_1234.livephoto')).toBe(false);
      expect(isBurstMemberPlainName('IMG_1234.burst')).toBe(false);
      expect(isBurstMemberPlainName('')).toBe(false);
    });

    test('when the burst infix appears in the middle but not at the end, then it is not detected as a member', () => {
      expect(isBurstMemberPlainName('IMG.burst.0.extra')).toBe(false);
    });
  });

  describe('when recovering the representative plain name from a member name', () => {
    test('when given a valid member name, then it returns the base without the burst suffix', () => {
      expect(getRepresentativePlainNameFromMember('IMG_1234.burst.0')).toBe('IMG_1234');
      expect(getRepresentativePlainNameFromMember('IMG_1234.burst.99')).toBe('IMG_1234');
    });

    test('when given a multi-word base name, then the full base is preserved', () => {
      expect(getRepresentativePlainNameFromMember('My Photo 2024.burst.3')).toBe('My Photo 2024');
    });
  });
});
