import * as MediaLibrary from 'expo-media-library';
import { Platform } from 'react-native';
import { getEnvironmentConfigFromUser } from 'src/lib/network';
import { AbortError } from 'src/network/errors';
import asyncStorageService from 'src/services/AsyncStorageService';
import { logger } from 'src/services/common';
import { stripFileUri } from 'src/services/common/uri/uriHelpers';
import fileSystemService from 'src/services/FileSystemService';
import { photosLocalDB } from '../database/photosLocalDB';
import { photoBackupFolders } from '../PhotoBackupFolders';
import { PhotoUploadEvent, UploadCredentials } from '../PhotoUploadService';
import { splitFileNameAndExtension } from '../PhotoUploadService.utils';
import { getBurstMemberPlainName } from './burst.constants';
import { BurstMember, BurstNativeModule } from './BurstNativeModule';

interface UploadMemberParams {
  localFilePath: string;
  folderUuid: string;
  plainName: string;
  fileExtension: string;
  creationIso: string;
  modificationIso: string;
  credentials: UploadCredentials;
  onProgress?: (ratio: number) => void;
  signal?: AbortSignal;
}

export interface BurstUploadResult {
  burstId: string;
  memberUuids: string[];
}

interface MaybeUploadMembersParams {
  assetId: string;
  representativePlainName: string;
  folderUuid: string;
  creationIso: string;
  modificationIso: string;
  credentials: UploadCredentials;
  signal?: AbortSignal;
  uploadMember: (params: UploadMemberParams) => Promise<string>;
  onEvent?: (event: PhotoUploadEvent) => void;
}

/**
 * Exports and uploads all non-representative members of a burst group (iOS only).
 *
 * @returns The burst ID and uploaded member UUIDs on success, or `null` if there are no members
 *   to upload — either because the asset is not a burst, or because limited photo access
 *   prevented the native export. The caller can distinguish the limited-access case by checking
 *   `isBurst` in the DB and calling `markSyncedBurst` with `memberCount = null` to schedule a retry.
 */
export const uploadBurstMembers = async (params: MaybeUploadMembersParams): Promise<BurstUploadResult | null> => {
  const {
    assetId,
    representativePlainName,
    folderUuid,
    creationIso,
    modificationIso,
    credentials,
    signal,
    uploadMember,
    onEvent,
  } = params;

  logger.info(`[BurstUpload] exportBurstMembers start — assetId=${assetId}`);
  let members: BurstMember[];
  try {
    members = await BurstNativeModule.exportBurstMembers(assetId);
  } catch (err) {
    logger.error(`[BurstUpload] exportBurstMembers threw — assetId=${assetId}: ${err}`);
    return null;
  }
  logger.info(`[BurstUpload] exportBurstMembers done — members=${members.length}`);
  if (members.length === 0) {
    return null;
  }
  onEvent?.({ type: 'burst-member-total', total: members.length });

  const memberUuids: string[] = [];
  const tempPaths: string[] = [];

  try {
    for (let i = 0; i < members.length; i++) {
      if (signal?.aborted) {
        throw new AbortError();
      }

      const member = members[i];
      const localFilePath = stripFileUri(member.uri);
      tempPaths.push(localFilePath);

      const { fileExtension: rawExt } = splitFileNameAndExtension(member.fileName);
      if (!rawExt) {
        logger.warn(`[BurstUpload] Member ${i} has no extension in fileName="${member.fileName}" — skipping`);
        continue;
      }
      const ext = rawExt.toLowerCase();
      const plainName = getBurstMemberPlainName(representativePlainName, i);

      const uuid = await uploadMember({
        localFilePath,
        folderUuid,
        plainName,
        fileExtension: ext,
        creationIso,
        modificationIso,
        credentials,
        signal,
      });

      memberUuids.push(uuid);
      onEvent?.({ type: 'burst-member-uploaded' });
    }
  } finally {
    for (const path of tempPaths) {
      await fileSystemService.unlinkIfExists(path);
    }
  }

  // burstId is the assetId of the representative
  return { burstId: assetId, memberUuids };
};

/**
 * Reads burst representatives marked synced but incomplete (members never uploaded, typically
 * because limited photo access prevented the native export) and retries exporting and uploading
 * their members. On success, marks the representative as fully synced. The representative itself
 * is never re-uploaded — only its members.
 *
 * Idempotent: if a previous attempt uploaded some members before failing (e.g. a network error),
 * those `.burst.N` files already exist in Drive and `uploadSingleFile`'s existence check skips them.
 *
 * @param params.onBurstEvent Forwards the `PhotoUploadEvent`s emitted per burst group (member count,
 *   member uploaded) to the caller, scoped to the representative's assetId — used to drive the live
 *   `Burst · n/m` progress shown while access is still limited.
 * @returns The number of burst groups fully completed in this call.
 */
export const retryIncompleteBursts = async (params: {
  deviceId: string;
  photosBucket: string;
  signal?: AbortSignal;
  uploadMember: (params: UploadMemberParams) => Promise<string>;
  onBurstEvent?: (assetId: string, event: PhotoUploadEvent) => void;
}): Promise<number> => {
  const { deviceId, photosBucket, signal, uploadMember } = params;

  const incompleteBursts = await photosLocalDB.getIncompleteBurstAssets();
  if (incompleteBursts.length === 0) {
    return 0;
  }

  const user = await asyncStorageService.getUser();
  const { encryptionKey, bridgeUser, bridgePass } = getEnvironmentConfigFromUser(user);
  const credentials: UploadCredentials = { bucketId: photosBucket, encryptionKey, bridgeUser, bridgePass };

  let completed = 0;
  for (const burst of incompleteBursts) {
    if (signal?.aborted) break;
    try {
      const createdDate = new Date(burst.creationTime ?? 0);
      const folderUuid = await photoBackupFolders.getOrCreateFolderForDate(deviceId, createdDate);
      const { plainName: representativePlainName } = splitFileNameAndExtension(burst.fileName ?? '');

      const result = await uploadBurstMembers({
        assetId: burst.assetId,
        representativePlainName,
        folderUuid,
        creationIso: createdDate.toISOString(),
        modificationIso: new Date(burst.modificationTime ?? burst.creationTime ?? 0).toISOString(),
        credentials,
        signal,
        uploadMember,
        onEvent: (event) => params.onBurstEvent?.(burst.assetId, event),
      });

      if (result) {
        await photosLocalDB.markSyncedBurst(
          burst.assetId,
          burst.remoteFileId ?? result.burstId,
          burst.modificationTime,
          result.burstId,
          result.memberUuids,
          result.memberUuids.length,
        );
        logger.info(`[BurstUpload] Retry complete — assetId=${burst.assetId} members=${result.memberUuids.length}`);
        completed++;
      }
    } catch (err) {
      if (err instanceof AbortError) break;
      logger.error(`[BurstUpload] Member retry failed for ${burst.assetId}: ${String(err)}`);
    }
  }
  return completed;
};

/**
 * Uploads burst members for an asset that is a burst representative on iOS.
 * No-op on Android or when the asset is not flagged as burst in the local DB.
 *
 * @returns Uploaded member UUIDs on success, `undefined` if the asset is not a burst or not on iOS.
 */
export const uploadBurstMembersIfBurst = async (params: {
  assetId: string;
  representativePlainName: string;
  folderUuid: string;
  creationIso: string;
  modificationIso: string;
  credentials: UploadCredentials;
  signal?: AbortSignal;
  uploadMember: (params: UploadMemberParams) => Promise<string>;
  onEvent?: (event: PhotoUploadEvent) => void;
}): Promise<BurstUploadResult | undefined> => {
  if (Platform.OS !== 'ios') {
    return undefined;
  }

  const status = await photosLocalDB.getStatus(params.assetId);
  if (!status?.isBurst) {
    return undefined;
  }

  const result = await uploadBurstMembers(params);
  return result ?? undefined;
};

/**
 * Resolves credentials and folder uuid, then uploads burst members for a representative
 * No-op on Android or when the asset is not flagged as burst in the local DB.
 *
 * @returns Uploaded member UUIDs on success, `undefined` if the asset is not a burst or not on iOS.
 */
export const uploadBurstMembersForExistingRepresentative = async (params: {
  asset: MediaLibrary.Asset;
  deviceId: string;
  photosBucket: string;
  signal?: AbortSignal;
  uploadMember: (params: UploadMemberParams) => Promise<string>;
  onEvent?: (event: PhotoUploadEvent) => void;
}): Promise<BurstUploadResult | undefined> => {
  const { asset, deviceId, photosBucket, signal, uploadMember } = params;

  if (Platform.OS !== 'ios') {
    return undefined;
  }
  const status = await photosLocalDB.getStatus(asset.id);
  if (!status?.isBurst) {
    return undefined;
  }

  const createdDate = new Date(asset.creationTime);
  const { plainName } = splitFileNameAndExtension(asset.filename);
  const [user, folderUuid] = await Promise.all([
    asyncStorageService.getUser(),
    photoBackupFolders.getOrCreateFolderForDate(deviceId, createdDate),
  ]);
  const { encryptionKey, bridgeUser, bridgePass } = getEnvironmentConfigFromUser(user);
  const credentials: UploadCredentials = { bucketId: photosBucket, encryptionKey, bridgeUser, bridgePass };
  const result = await uploadBurstMembers({
    assetId: asset.id,
    representativePlainName: plainName,
    folderUuid,
    creationIso: createdDate.toISOString(),
    modificationIso: new Date(asset.modificationTime).toISOString(),
    credentials,
    signal,
    uploadMember,
    onEvent: params.onEvent,
  });
  return result ?? undefined;
};
