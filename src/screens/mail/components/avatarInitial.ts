/**
 * Reads the letter that stands for someone in an avatar: the first one of their display name, and
 * the first one of their address when there is no name.
 *
 * @param name - Display name, when there is one.
 * @param address - Address the letter falls back to.
 * @returns A single uppercase letter, or `?` when neither holds one.
 */
export const initialOf = (name: string | undefined, address: string): string => {
  const source = name?.trim() || address.trim();
  const letter = [...source].find((character) => /\p{L}|\p{N}/u.test(character));

  return letter ? letter.toUpperCase() : '?';
};

/** Returns an index below `paletteSize` that depends only on the address, ignoring case and surrounding spaces. */
export const getPaletteIndex = (address: string, paletteSize: number): number => {
  const characterSum = [...address.trim().toLowerCase()].reduce(
    (sum, character) => sum + (character.codePointAt(0) ?? 0),
    0,
  );
  return characterSum % paletteSize;
};
