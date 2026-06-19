import { BurstRole } from '../database/photosLocalDB';
import { getRepresentativePlainNameFromMember, isBurstMemberPlainName } from './burst.constants';

interface BurstLinkResult {
  burstRole: BurstRole;
  burstGroupId: string;
}

/**
 * Resolves the burst role and group ID for a single cloud asset entry during cloud history sync.
 *
 *
 * @param plainName - Plain name of the cloud asset (e.g. `"IMG_0042"` or `"IMG_0042.burst.3"`).
 * @param remoteFileId - Remote file ID of this asset, used as `burstGroupId` when it is the representative.
 * @param plainNameIndex - Map of `plainName -> remoteFileId` for the current discovery batch; used to look up the representative's ID from a member.
 * @param burstBaseSet - Pre-computed set of base plain names that have at least one `.burst.N` child in the batch. Build it once with {@link buildBurstBaseSet} before iterating entries.
 * @returns A `BurstLinkResult` with role and group ID, or `null` if the asset is not part of any burst group.
 */
export const linkBurst = (
  plainName: string | null | undefined,
  remoteFileId: string,
  plainNameIndex: Map<string, string>,
  burstBaseSet: Set<string>,
): BurstLinkResult | null => {
  if (!plainName) return null;

  if (isBurstMemberPlainName(plainName)) {
    const baseName = getRepresentativePlainNameFromMember(plainName);
    const repRemoteFileId = plainNameIndex.get(baseName.toLowerCase());
    if (!repRemoteFileId) {
      return null;
    }
    return { burstRole: 'member', burstGroupId: repRemoteFileId };
  }

  if (burstBaseSet.has(plainName)) {
    return { burstRole: 'representative', burstGroupId: remoteFileId };
  }

  return null;
};

/**
 * Builds the set of base plain names that have at least one `.burst.N` child in the batch.
 *
 * Call this once per discovery batch before iterating entries, then pass the result to {@link linkBurst}.
 *
 * @param plainNames - All decrypted plain names in the current discovery batch (nulls/undefineds are skipped).
 * @returns A `Set` of base plain names (e.g. `"IMG_0042"`) for which at least one burst member exists.
 */
export const buildBurstBaseSet = (plainNames: (string | null | undefined)[]): Set<string> => {
  const set = new Set<string>();
  for (const name of plainNames) {
    if (name && isBurstMemberPlainName(name)) {
      set.add(getRepresentativePlainNameFromMember(name));
    }
  }
  return set;
};
