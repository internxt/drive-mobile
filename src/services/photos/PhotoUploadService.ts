import * as RNFS from '@dr.pogodin/react-native-fs';
import { EncryptionVersion } from '@internxt/sdk/dist/drive/storage/types';
import * as MediaLibrary from 'expo-media-library';
import { Platform } from 'react-native';
import { getEnvironmentConfigFromUser } from 'src/lib/network';
import { uploadFile } from 'src/network/upload';
import { constants } from 'src/services/AppService';
import asyncStorageService from 'src/services/AsyncStorageService';
import { uploadService } from 'src/services/common/network/upload/upload.service';
import { photoBackupFolders } from './PhotoBackupFolders';
import {
  ANDROID_CONTENT_URI_SCHEME,
  ICLOUD_URI_SCHEME,
  extractExtensionFromContentUri,
  splitFileNameAndExtension,
  stripFileScheme,
  stripFileSchemeAndFragment,
} from './PhotoUploadService.utils';

const TEMP_FILE_PREFIX = 'photo_upload_';

interface BucketUploadResult {
  bucketFileId: string;
  bucketId: string;
  fileSize: number;
  plainName: string;
  fileExtension: string;
  modificationIso: string;
  creationIso: string;
  folderUuid: string;
}

const resolveLocalPath = async (asset: MediaLibrary.Asset): Promise<{ localPath: string; tempPath?: string }> => {
  if (Platform.OS === 'ios') {
    const assetInfo = await MediaLibrary.getAssetInfoAsync(asset.id, { shouldDownloadFromNetwork: false });
    const rawUri = assetInfo.localUri ?? asset.uri;
    if (!rawUri || rawUri.startsWith(ICLOUD_URI_SCHEME)) {
      throw new Error(`Asset ${asset.id} has no local URI — may be stored in iCloud`);
    }

    return { localPath: stripFileSchemeAndFragment(rawUri) };
  }

  const uri = asset.uri;
  if (uri.startsWith(ANDROID_CONTENT_URI_SCHEME)) {
    const ext = extractExtensionFromContentUri(uri);
    const tempPath = `${RNFS.CachesDirectoryPath}/${TEMP_FILE_PREFIX}${asset.id}.${ext}`;
    await RNFS.copyFile(uri, tempPath);
    return { localPath: tempPath, tempPath };
  }
  return { localPath: stripFileScheme(uri) };
};

const uploadAssetToBucket = async (
  asset: MediaLibrary.Asset,
  deviceId: string,
  onProgress?: (ratio: number) => void,
): Promise<BucketUploadResult> => {
  const { localPath: localFilePath, tempPath } = await resolveLocalPath(asset);

  const createdDate = new Date(asset.creationTime);
  const creationIso = createdDate.toISOString();
  const modificationIso = new Date(asset.modificationTime).toISOString();
  const fileName = localFilePath.split('/').pop() ?? asset.filename;

  const [fileStat, user, folderUuid] = await Promise.all([
    RNFS.stat(localFilePath),
    asyncStorageService.getUser(),
    photoBackupFolders.getOrCreateFolderForDate(deviceId, createdDate),
  ]);
  const { bucketId, encryptionKey, bridgeUser, bridgePass } = getEnvironmentConfigFromUser(user);

  let bucketFileId: string;
  try {
    bucketFileId = await uploadFile(
      localFilePath,
      bucketId,
      encryptionKey,
      constants.BRIDGE_URL,
      { user: bridgeUser, pass: bridgePass },
      { notifyProgress: onProgress },
    );
  } catch (uploadError) {
    const msg = uploadError instanceof Error ? uploadError.message : String(uploadError);
    throw new Error(`Bucket upload failed for ${fileName}: ${msg}`);
  } finally {
    if (tempPath) await RNFS.unlink(tempPath).catch(() => null);
  }

  const { plainName, fileExtension } = splitFileNameAndExtension(fileName);

  return {
    bucketFileId,
    bucketId,
    fileSize: fileStat.size,
    plainName,
    fileExtension,
    modificationIso,
    creationIso,
    folderUuid,
  };
};

export const PhotoUploadService = {
  async upload(asset: MediaLibrary.Asset, deviceId: string, onProgress?: (ratio: number) => void): Promise<string> {
    const { bucketFileId, bucketId, fileSize, plainName, fileExtension, modificationIso, creationIso, folderUuid } =
      await uploadAssetToBucket(asset, deviceId, onProgress);

    const driveFile = await uploadService.createFileEntry({
      fileId: bucketFileId,
      type: fileExtension,
      size: fileSize,
      plainName,
      bucket: bucketId,
      folderUuid,
      encryptVersion: EncryptionVersion.Aes03,
      modificationTime: modificationIso,
      creationTime: creationIso,
    });

    return driveFile.uuid;
  },

  async replace(
    asset: MediaLibrary.Asset,
    existingRemoteFileId: string,
    deviceId: string,
    onProgress?: (ratio: number) => void,
  ): Promise<string> {
    const { bucketFileId, fileSize } = await uploadAssetToBucket(asset, deviceId, onProgress);

    await uploadService.replaceFileEntry(existingRemoteFileId, { fileId: bucketFileId, size: fileSize });

    return existingRemoteFileId;
  },
};
