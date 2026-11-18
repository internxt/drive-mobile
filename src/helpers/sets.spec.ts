import { areSetsEqual } from './sets';

describe('Comparing two sets', () => {
  test('when both sets hold the same elements in a different order, then they are equal', () => {
    expect(areSetsEqual(new Set(['a', 'b', 'c']), new Set(['c', 'a', 'b']))).toBe(true);
  });

  test('when both sets are empty, then they are equal', () => {
    expect(areSetsEqual(new Set(), new Set())).toBe(true);
  });

  test('when the sets have a different number of elements, then they are not equal', () => {
    expect(areSetsEqual(new Set(['a', 'b']), new Set(['a', 'b', 'c']))).toBe(false);
  });

  test('when the sets have the same size but one element differs, then they are not equal', () => {
    expect(areSetsEqual(new Set(['a', 'b', 'c']), new Set(['a', 'b', 'd']))).toBe(false);
  });
});
