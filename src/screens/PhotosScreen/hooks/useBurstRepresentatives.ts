import { useEffect, useState } from 'react';
import useDebouncedValue from 'src/hooks/useDebouncedValue';
import { logger } from 'src/services/common';
import { BurstNativeModule } from 'src/services/photos/burst/BurstNativeModule';

const BURST_LOOKUP_DEBOUNCE_MS = 400;

/**
 * Resolves which of the given assets are the representative photo of a burst group.
 *
 * @param assetIds - Ids of the currently loaded local assets to look up.
 * @returns Ids of the assets that represent their burst group.
 */
export const useBurstRepresentatives = (assetIds: string[]): Set<string> => {
  const [burstRepresentativeIdSet, setBurstRepresentativeIdSet] = useState<Set<string>>(new Set());
  const debouncedAssetIds = useDebouncedValue(assetIds, BURST_LOOKUP_DEBOUNCE_MS);

  useEffect(() => {
    if (debouncedAssetIds.length === 0) {
      return;
    }
    BurstNativeModule.getBurstRepresentativeIds(debouncedAssetIds)
      .then((ids) => setBurstRepresentativeIdSet(new Set(ids)))
      .catch((err) => logger.error(`[LocalAssets] getBurstRepresentativeIds failed: ${err}`));
  }, [debouncedAssetIds]);

  return burstRepresentativeIdSet;
};
