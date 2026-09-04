import * as RNFS from '@dr.pogodin/react-native-fs';
import { EncryptionVersion } from '@internxt/sdk/dist/drive/storage/types';
import { getEnvironmentConfigFromUser } from 'src/lib/network';
import { uploadFile } from 'src/network/upload';
import { constants } from 'src/services/AppService';
import asyncStorageService from 'src/services/AsyncStorageService';
import { logger } from 'src/services/common';
import { HTTP_CONFLICT } from 'src/services/common/httpStatusCodes';
import { uploadService } from 'src/services/common/network/upload/upload.service';
import { driveFileService } from 'src/services/drive/file/driveFile.service';
import { driveFolderService } from 'src/services/drive/folder/driveFolder.service';
import fileSystemService from 'src/services/FileSystemService';
import { ManifestAssetEntry, photosLocalDB } from './database/photosLocalDB';
import { PhotoAssetScanner } from './PhotoAssetScanner';
import { photoBackupFolders } from './PhotoBackupFolders';

const TAG = '[PhotoSyncManifestService]';
const MANIFEST_SCHEMA_VERSION = 1;
const MANIFEST_PLAIN_NAME = 'manifest';
const MANIFEST_TYPE = 'json';

const MANIFEST_CHECKPOINT_TTL_MS = 5 * 60 * 1000;
const MANIFEST_CHECKPOINT_ASSET_THRESHOLD = 100;

interface PhotoSyncManifest {
  schemaVersion: number;
  deviceId: string;
  generatedAt: number;
  entries: ManifestAssetEntry[];
}

class PhotoSyncManifestService {
  private lastManifestUploadAt = Date.now();
  private assetsSyncedSinceLastManifestUpload = 0;

  private inFlightRestore: Promise<{ restoredCount: number } | null> | null = null;

  /**
   * Exports the `synced`/`cloud_deleted` asset_sync rows to a JSON manifest and uploads it to
   * `.sync/manifest.json` under the device folder, replacing any previous version.
   * Best-effort: errors are logged and swallowed, never thrown.
   */
  async uploadManifest(deviceId: string, photosBucket: string): Promise<void> {
    let tempPath: string | undefined;
    try {
      logger.info(TAG, `Uploading manifest for device=${deviceId}...`);
      const entries = await photosLocalDB.getManifestEntries();
      if (entries.length === 0) {
        logger.info(TAG, 'No synced entries to export — skipping manifest upload');
        return;
      }

      const manifest: PhotoSyncManifest = {
        schemaVersion: MANIFEST_SCHEMA_VERSION,
        deviceId,
        generatedAt: Date.now(),
        entries,
      };

      tempPath = this.manifestTempPath(`upload-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      await RNFS.writeFile(tempPath, JSON.stringify(manifest), 'utf8');
      const fileStat = await fileSystemService.stat(tempPath);

      const [syncFolderUuid, user] = await Promise.all([
        photoBackupFolders.getOrCreateSyncFolder(deviceId),
        asyncStorageService.getUser(),
      ]);
      const { encryptionKey, bridgeUser, bridgePass } = getEnvironmentConfigFromUser(user);

      const fileId = await uploadFile(
        tempPath,
        photosBucket,
        encryptionKey,
        constants.BRIDGE_URL,
        { user: bridgeUser, pass: bridgePass },
        {},
      );

      await this.replaceOrCreateManifestEntry({ syncFolderUuid, photosBucket, fileId, size: fileStat.size });
      this.resetCheckpointWindow();

      logger.info(TAG, `Manifest uploaded — ${entries.length} entries`);
    } catch (error) {
      logger.error(TAG, `Failed to upload manifest: ${error}`);
    } finally {
      if (tempPath) {
        await fileSystemService.unlinkIfExists(tempPath);
      }
    }
  }

  /**
   * Counts one synced asset and uploads the manifest once a checkpoint threshold is reached
   * (time elapsed or assets synced). Call after each asset finishes uploading during a cycle.
   * Safe to call concurrently: at most one upload fires per checkpoint window.
   */
  async maybeUploadManifest(deviceId: string, photosBucket: string): Promise<void> {
    this.assetsSyncedSinceLastManifestUpload += 1;
    const dueByTime = Date.now() - this.lastManifestUploadAt >= MANIFEST_CHECKPOINT_TTL_MS;
    const dueByCount = this.assetsSyncedSinceLastManifestUpload >= MANIFEST_CHECKPOINT_ASSET_THRESHOLD;
    if (!dueByTime && !dueByCount) {
      return;
    }

    logger.info(TAG, `Checkpoint triggered (${dueByTime ? 'TTL elapsed' : 'asset threshold reached'})`);
    this.resetCheckpointWindow();
    await this.uploadManifest(deviceId, photosBucket);
  }

  /**
   * Downloads device's manifest from Drive and restores into `asset_sync` the
   * entries whose asset still exists in the local gallery. Concurrent calls share the same
   * in-flight restore. Returns the restored count, or null if nothing was restored or it failed.
   */
  async restoreManifest(deviceId: string): Promise<{ restoredCount: number } | null> {
    if (this.inFlightRestore) {
      return this.inFlightRestore;
    }
    this.inFlightRestore = this.restoreManifestFromDrive(deviceId).finally(() => {
      this.inFlightRestore = null;
    });

    return this.inFlightRestore;
  }

  private resetCheckpointWindow(): void {
    this.lastManifestUploadAt = Date.now();
    this.assetsSyncedSinceLastManifestUpload = 0;
  }

  private manifestTempPath(suffix: string): string {
    return `${fileSystemService.getCacheDir()}/photo_sync_manifest_${suffix}.json`;
  }

  private async replaceOrCreateManifestEntry(params: {
    syncFolderUuid: string;
    photosBucket: string;
    fileId: string;
    size: number;
  }): Promise<void> {
    const { syncFolderUuid, photosBucket, fileId, size } = params;
    const { existentFiles } = await uploadService.checkFileExistence(syncFolderUuid, [
      { plainName: MANIFEST_PLAIN_NAME, type: MANIFEST_TYPE },
    ]);

    if (existentFiles[0]?.uuid) {
      await uploadService.replaceFileEntry(existentFiles[0].uuid, { fileId, size });
      return;
    }

    try {
      await uploadService.createFileEntry({
        fileId,
        type: MANIFEST_TYPE,
        size,
        plainName: MANIFEST_PLAIN_NAME,
        bucket: photosBucket,
        folderUuid: syncFolderUuid,
        encryptVersion: EncryptionVersion.Aes03,
        modificationTime: new Date().toISOString(),
        creationTime: new Date().toISOString(),
      });
    } catch (err) {
      if ((err as { status?: number })?.status !== HTTP_CONFLICT) throw err;
      const { existentFiles: retryFiles } = await uploadService.checkFileExistence(syncFolderUuid, [
        { plainName: MANIFEST_PLAIN_NAME, type: MANIFEST_TYPE },
      ]);
      if (!retryFiles[0]?.uuid) {
        throw err;
      }
      await uploadService.replaceFileEntry(retryFiles[0].uuid, { fileId, size });
    }
  }

  private async restoreManifestFromDrive(deviceId: string): Promise<{ restoredCount: number } | null> {
    let tempPath: string | undefined;
    try {
      const syncFolderUuid = await photoBackupFolders.getOrCreateSyncFolder(deviceId);
      const folderContent = await driveFolderService.getFolderContentByUuid(syncFolderUuid);
      const manifestFile = folderContent.files.find(
        (file) => (file.plainName ?? file.name) === MANIFEST_PLAIN_NAME && file.type === MANIFEST_TYPE,
      );
      if (!manifestFile?.fileId || !manifestFile.bucket) {
        logger.info(TAG, 'No manifest found for this device — skipping restore');
        return null;
      }

      const user = await asyncStorageService.getUser();
      tempPath = this.manifestTempPath('restore');

      await driveFileService.downloadFile(
        user,
        manifestFile.bucket,
        manifestFile.fileId,
        { downloadPath: tempPath },
        manifestFile.size ? Number(manifestFile.size) : 0,
      );

      const raw = await RNFS.readFile(tempPath, 'utf8');
      const manifest = JSON.parse(raw) as PhotoSyncManifest;

      if (manifest.schemaVersion !== MANIFEST_SCHEMA_VERSION) {
        logger.warn(
          TAG,
          `Manifest schema version mismatch (manifest=${manifest.schemaVersion}, supported=${MANIFEST_SCHEMA_VERSION}) — discarding`,
        );
        return null;
      }
      if (manifest.deviceId !== deviceId) {
        logger.warn(
          TAG,
          `Manifest deviceId mismatch (manifest=${manifest.deviceId}, current=${deviceId}) — discarding`,
        );
        return null;
      }
      if (!Array.isArray(manifest.entries) || manifest.entries.length === 0) {
        return null;
      }

      const localAssets = await PhotoAssetScanner.getAssetsByIds(manifest.entries.map((entry) => entry.assetId));
      const localAssetIds = new Set(localAssets.map((asset) => asset.id));
      const restorableEntries = manifest.entries.filter((entry) => localAssetIds.has(entry.assetId));

      await photosLocalDB.restoreEntries(restorableEntries);

      logger.info(
        TAG,
        `Manifest restored — ${restorableEntries.length}/${manifest.entries.length} entries matched local assets`,
      );
      return { restoredCount: restorableEntries.length };
    } catch (error) {
      logger.error(TAG, `Failed to restore manifest: ${error}`);
      return null;
    } finally {
      if (tempPath) await fileSystemService.unlinkIfExists(tempPath);
    }
  }
}

export const photoSyncManifestService = new PhotoSyncManifestService();
