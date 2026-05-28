import * as RNFS from '@dr.pogodin/react-native-fs';
import * as Clipboard from 'expo-clipboard';
import * as MediaLibrary from 'expo-media-library';
import { TimelinePhotoItem } from 'src/screens/PhotosScreen/types';
import { logger } from 'src/services/common';
import { stripFileUri, toFileUri } from 'src/services/common/uri/uriHelpers';
import { driveTrashService } from 'src/services/drive/trash/driveTrash.service';
import fileSystemService from 'src/services/FileSystemService';
import { photosLocalDB } from './database/photosLocalDB';
import { SavePermissionDeniedError } from './errors';
import { PhotoAssetFetchService } from './PhotoAssetFetchService';

type CleanupItem = { type: 'cloud'; assetId: string } | { type: 'local-backed'; assetId: string; remoteFileId: string };

class PhotoActionsService {
  async exportItems(items: TimelinePhotoItem[], signal: AbortSignal): Promise<void> {
    for (const item of items) {
      if (signal.aborted) {
        return;
      }

      let result;
      try {
        result = await PhotoAssetFetchService.resolveExportUri(item, signal);
        if (!result) {
          logger.warn(`[PhotoActionsService] export — no URI resolved for ${item.id}, skipping`);
          continue;
        }
        if (signal.aborted) {
          return;
        }

        await fileSystemService.shareFile({ title: '', fileUri: toFileUri(result.uri) });
      } catch (error) {
        logger.error(`[PhotoActionsService] export failed for ${item.id}: ${error}`);
        throw error;
      } finally {
        result?.cleanup?.();
      }
    }
  }

  async saveToDevice(item: TimelinePhotoItem, signal: AbortSignal): Promise<void> {
    const { status } = await MediaLibrary.requestPermissionsAsync(true);
    if (status !== 'granted') {
      logger.warn(`[PhotoActionsService] saveToDevice — permission not granted (status: ${status})`);
      throw new SavePermissionDeniedError();
    }

    const uri = await PhotoAssetFetchService.fetchUri(item, signal);
    if (!uri) {
      logger.warn(`[PhotoActionsService] saveToDevice — no URI resolved for ${item.id}`);
      return;
    }
    if (signal.aborted) {
      return;
    }

    try {
      const fileUri = toFileUri(uri);
      await MediaLibrary.saveToLibraryAsync(fileUri);
    } catch (error) {
      logger.error(`[PhotoActionsService] saveToDevice failed for ${item.id}: ${error}`);
      throw error;
    }
  }

  private async classifyItems(
    items: TimelinePhotoItem[],
    signal: AbortSignal,
  ): Promise<{
    trashPayload: { id: string; type: 'file'; uuid: string }[];
    cleanupItems: CleanupItem[];
  }> {
    const trashPayload: { id: string; type: 'file'; uuid: string }[] = [];
    const cleanupItems: CleanupItem[] = [];

    for (const item of items) {
      if (signal.aborted) {
        return { trashPayload, cleanupItems };
      }

      if (item.type === 'cloud-only') {
        trashPayload.push({ id: item.id, type: 'file', uuid: item.id });
        cleanupItems.push({ type: 'cloud', assetId: item.id });
      } else if (item.type === 'local' && item.backupState === 'backed') {
        const itemDbEntry = await photosLocalDB.getStatus(item.id);

        if (itemDbEntry?.remoteFileId) {
          const { remoteFileId } = itemDbEntry;
          trashPayload.push({ id: remoteFileId, type: 'file', uuid: remoteFileId });
          cleanupItems.push({ type: 'local-backed', assetId: item.id, remoteFileId });
        } else {
          logger.info(`[PhotoActionsService] trash — local-backed ${item.id} has no remoteFileId, skipping`);
        }
      } else {
        logger.info(
          `[PhotoActionsService] trash — skipping ${item.id} (type=${item.type}, backupState=${item.type === 'local' ? item.backupState : 'n/a'})`,
        );
      }
    }

    return { trashPayload, cleanupItems };
  }

  private async removeItemsFromDB(cleanupItems: CleanupItem[]): Promise<void> {
    for (const target of cleanupItems) {
      if (target.type === 'cloud') {
        await photosLocalDB.deleteCloudAsset(target.assetId);
      } else {
        await photosLocalDB.markAssetDeleted(target.assetId);
        await photosLocalDB.deleteCloudAsset(target.remoteFileId);
      }
    }
  }

  async restoreToCloud(items: TimelinePhotoItem[], signal: AbortSignal): Promise<void> {
    for (const item of items) {
      if (signal.aborted) {
        return;
      }
      if (item.type !== 'local') {
        continue;
      }
      await photosLocalDB.markPending(item.id);
    }
  }

  async trash(items: TimelinePhotoItem[], signal: AbortSignal): Promise<void> {
    const { trashPayload, cleanupItems } = await this.classifyItems(items, signal);

    logger.info(`[PhotoActionsService] trash — sending ${trashPayload.length}/${items.length} items to Drive trash`);
    if (trashPayload.length > 0) {
      await driveTrashService.moveToTrash(trashPayload);
      logger.info('[PhotoActionsService] trash — moveToTrash done');
    }

    await this.removeItemsFromDB(cleanupItems);
    logger.info('[PhotoActionsService] trash — DB cleanup done');
  }

  async copyToClipboard(item: TimelinePhotoItem, signal: AbortSignal): Promise<void> {
    const uri = await PhotoAssetFetchService.fetchUri(item, signal);
    if (!uri) {
      logger.warn(`[PhotoActionsService] copyToClipboard — no URI resolved for ${item.id}`);
      return;
    }
    if (signal.aborted) return;

    try {
      const fileUri = stripFileUri(uri);
      const base64 = await RNFS.readFile(fileUri, 'base64');
      await Clipboard.setImageAsync(base64);
    } catch (error) {
      logger.error(`[PhotoActionsService] copyToClipboard failed for ${item.id}: ${error}`);
      throw error;
    }
  }
}

export const photoActionsService = new PhotoActionsService();
