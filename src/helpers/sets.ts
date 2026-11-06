/**
 * Compares two sets by membership in linear time.
 *
 * @returns `true` when both sets have the same size and every element of `first` is in `second`.
 */
export const areSetsEqual = <T>(first: ReadonlySet<T>, second: ReadonlySet<T>): boolean => {
  if (first.size !== second.size) {
    return false;
  }
  for (const element of first) {
    if (!second.has(element)) {
      return false;
    }
  }
  return true;
};
