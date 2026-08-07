const MIN_PLAUSIBLE_TIMESTAMP_MS = new Date('1980-01-01T00:00:00Z').getTime();

export const isPlausibleAssetTimestamp = (timestamp: number | null | undefined): timestamp is number =>
  typeof timestamp === 'number' && timestamp >= MIN_PLAUSIBLE_TIMESTAMP_MS;

/**
 * Resolves the creation time to use for an asset, falling back to `modificationTime` whenever
 * `creationTime` predates 1980.
 *
 * Workaround for some Android versions where MediaStore's DATE_ADDED comes back as 0 (or
 * another implausibly old value), while DATE_MODIFIED is always set correctly.
 *
 * @param creationTime - The asset's raw creation time in milliseconds.
 * @param modificationTime - The asset's raw modification time in milliseconds, used as a fallback.
 * @returns The resolved creation time in milliseconds, or `null` if neither value is available.
 */
export const resolveAssetCreationTime = (
  creationTime: number | null | undefined,
  modificationTime: number | null | undefined,
): number | null => {
  if (isPlausibleAssetTimestamp(creationTime)) {
    return creationTime;
  }
  if (isPlausibleAssetTimestamp(modificationTime)) {
    return modificationTime;
  }
  return creationTime ?? modificationTime ?? null;
};

interface AssetTimestamps {
  creationTime: number;
  modificationTime: number;
}

/**
 * Returns a copy of the given asset with its `creationTime` replaced by the result of
 * `resolveAssetCreationTime`.
 *
 * @param asset - An object with `creationTime` and `modificationTime` fields (e.g. a
 * `MediaLibrary.Asset`).
 * @returns A shallow copy of `asset` with `creationTime` set to the resolved value.
 */
export const normalizeAssetCreationTime = <T extends AssetTimestamps>(asset: T): T => ({
  ...asset,
  creationTime: resolveAssetCreationTime(asset.creationTime, asset.modificationTime) ?? asset.creationTime,
});
