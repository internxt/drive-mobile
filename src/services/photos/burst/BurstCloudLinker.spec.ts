import { buildBurstBaseSet, linkBurst } from './BurstCloudLinker';

describe('burst cloud linker', () => {
  describe('when building the burst base set from a list of plain names', () => {
    test('when the list contains member names, then their base names are included in the set', () => {
      const set = buildBurstBaseSet(['IMG_1234', 'IMG_1234.burst.0', 'IMG_1234.burst.1', 'Other']);
      expect(set.has('IMG_1234')).toBe(true);
      expect(set.has('Other')).toBe(false);
    });

    test('when the list has no member names, then the set is empty', () => {
      const set = buildBurstBaseSet(['IMG_1234', 'Another']);
      expect(set.size).toBe(0);
    });

    test('when the list contains null or undefined entries, then they are ignored', () => {
      const set = buildBurstBaseSet([null, undefined, 'IMG.burst.0']);
      expect(set.has('IMG')).toBe(true);
    });
  });

  describe('when linking a cloud asset to a burst group', () => {
    const plainNameIndex = new Map<string, string>([
      ['img_1234', 'uuid-representative'],
      ['img_1234.burst.0', 'uuid-member-0'],
    ]);
    const burstBaseSet = new Set(['img_1234']);

    test('when the plain name belongs to a burst member and the representative exists, then it returns the member role and the representative uuid as group id', () => {
      const result = linkBurst('img_1234.burst.0', 'uuid-member-0', plainNameIndex, burstBaseSet);
      expect(result).toEqual({ burstRole: 'member', burstGroupId: 'uuid-representative' });
    });

    test('when the plain name is a burst member with uppercase letters and the index has lowercase keys, then it still resolves the representative', () => {
      const upperIndex = new Map<string, string>([['img_1234', 'uuid-representative']]);
      const result = linkBurst('IMG_1234.burst.0', 'uuid-member-0', upperIndex, burstBaseSet);
      expect(result).toEqual({ burstRole: 'member', burstGroupId: 'uuid-representative' });
    });

    test('when the plain name is a representative with known members, then it returns the representative role and its own uuid as group id', () => {
      const result = linkBurst('img_1234', 'uuid-representative', plainNameIndex, burstBaseSet);
      expect(result).toEqual({ burstRole: 'representative', burstGroupId: 'uuid-representative' });
    });

    test('when the plain name is a member but the representative is not in the index, then it returns null', () => {
      const emptyIndex = new Map<string, string>();
      const result = linkBurst('img_9999.burst.0', 'uuid-orphan', emptyIndex, burstBaseSet);
      expect(result).toBeNull();
    });

    test('when the plain name is neither a member nor a representative in the base set, then it returns null', () => {
      const result = linkBurst('regular_photo', 'uuid-regular', plainNameIndex, burstBaseSet);
      expect(result).toBeNull();
    });

    test('when the plain name is null, then it returns null', () => {
      const result = linkBurst(null, 'uuid-null', plainNameIndex, burstBaseSet);
      expect(result).toBeNull();
    });
  });
});
