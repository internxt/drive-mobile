import * as RNFS from '@dr.pogodin/react-native-fs';
import * as Clipboard from 'expo-clipboard';
import * as MediaLibrary from 'expo-media-library';
import { TimelinePhotoItem } from 'src/screens/PhotosScreen/types';
import { logger } from 'src/services/common';
import { stripFileUri, toFileUri } from 'src/services/common/uri/uriHelpers';
import fileSystemService from 'src/services/FileSystemService';
import { PhotoAssetFetchService } from './PhotoAssetFetchService';

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
      } finally {
        result?.cleanup?.();
      }
    }
  }

  async saveToDevice(item: TimelinePhotoItem, signal: AbortSignal): Promise<void> {
    const { status } = await MediaLibrary.requestPermissionsAsync(true);
    if (status !== 'granted') {
      logger.warn(`[PhotoActionsService] saveToDevice — permission not granted (status: ${status})`);
      return;
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
