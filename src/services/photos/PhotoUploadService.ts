import * as RNFS from '@dr.pogodin/react-native-fs';
import { EncryptionVersion } from '@internxt/sdk/dist/drive/storage/types';
import * as MediaLibrary from 'expo-media-library';
import { Platform } from 'react-native';
import { getEnvironmentConfigFromUser } from 'src/lib/network';
import { uploadFile } from 'src/network/upload';
import { constants } from 'src/services/AppService';
import asyncStorageService from 'src/services/AsyncStorageService';
import { isThumbnailSupported } from 'src/services/common/media/thumbnail.constants';
import { generateThumbnail } from 'src/services/common/media/thumbnail.generation';
import { uploadService } from 'src/services/common/network/upload/upload.service';
import { FileAlreadyExistsError } from './errors';
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

interface UploadCredentials {
  bucketId: string;
  encryptionKey: string;
  bridgeUser: string;
  bridgePass: string;
}

interface FileUploadResult {
  fileId: string;
  bucketId: string;
  fileSize: number;
  plainName: string;
  fileExtension: string;
  modificationIso: string;
  creationIso: string;
  folderUuid: string;
  localFilePath: string;
  tempPath?: string;
  credentials: UploadCredentials;
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
): Promise<FileUploadResult> => {
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
  const { plainName, fileExtension } = splitFileNameAndExtension(fileName);

  const { existentFiles } = await uploadService.checkFileExistence(folderUuid, [{ plainName, type: fileExtension }]);
  if (existentFiles.length > 0) {
    await cleanupTempFile(tempPath);
    throw new FileAlreadyExistsError(`${plainName}.${fileExtension}`, existentFiles[0].uuid);
  }

  let fileId: string;
  try {
    fileId = await uploadFile(
      localFilePath,
      bucketId,
      encryptionKey,
      constants.BRIDGE_URL,
      { user: bridgeUser, pass: bridgePass },
      { notifyProgress: onProgress },
    );
  } catch (uploadError) {
    await cleanupTempFile(tempPath);
    const message = uploadError instanceof Error ? uploadError.message : String(uploadError);
    throw new Error(`Bucket upload failed for ${fileName}: ${message}`);
  }

  return {
    fileId,
    bucketId,
    fileSize: fileStat.size,
    plainName,
    fileExtension,
    modificationIso,
    creationIso,
    folderUuid,
    localFilePath,
    tempPath,
    credentials: { bucketId, encryptionKey, bridgeUser, bridgePass },
  };
};

const cleanupTempFile = async (tempPath?: string): Promise<void> => {
  if (!tempPath) return;
  await RNFS.unlink(tempPath).catch(() => null);
};

const uploadThumbnailForAsset = async (
  localFilePath: string,
  fileExtension: string,
  fileUuid: string,
  credentials: UploadCredentials,
): Promise<void> => {
  if (!isThumbnailSupported(fileExtension)) return;

  let thumbnailPath: string | undefined;
  try {
    const thumbnail = await generateThumbnail(localFilePath, fileExtension);
    thumbnailPath = thumbnail.path;

    const thumbnailFileId = await uploadFile(
      thumbnail.path,
      credentials.bucketId,
      credentials.encryptionKey,
      constants.BRIDGE_URL,
      { user: credentials.bridgeUser, pass: credentials.bridgePass },
      {},
    );

    await uploadService.createThumbnailEntry({
      fileUuid,
      type: thumbnail.type,
      size: thumbnail.size,
      maxWidth: thumbnail.width,
      maxHeight: thumbnail.height,
      bucketId: credentials.bucketId,
      bucketFile: thumbnailFileId,
      encryptVersion: EncryptionVersion.Aes03,
    });
  } catch {
    // Thumbnail is best-effort — never block the main upload result
  } finally {
    await cleanupTempFile(thumbnailPath);
  }
};

export const PhotoUploadService = {
  async upload(asset: MediaLibrary.Asset, deviceId: string, onProgress?: (ratio: number) => void): Promise<string> {
    let fileUploadResult: FileUploadResult;
    try {
      fileUploadResult = await uploadAssetToBucket(asset, deviceId, onProgress);
    } catch (err) {
      if (err instanceof FileAlreadyExistsError) {
        return err.existingUuid;
      }
      throw err;
    }

    const {
      fileId,
      bucketId,
      fileSize,
      plainName,
      fileExtension,
      modificationIso,
      creationIso,
      folderUuid,
      localFilePath,
      tempPath,
      credentials,
    } = fileUploadResult;

    try {
      const driveFile = await uploadService.createFileEntry({
        fileId,
        type: fileExtension,
        size: fileSize,
        plainName,
        bucket: bucketId,
        folderUuid,
        encryptVersion: EncryptionVersion.Aes03,
        modificationTime: modificationIso,
        creationTime: creationIso,
      });

      await uploadThumbnailForAsset(localFilePath, fileExtension, driveFile.uuid, credentials);

      return driveFile.uuid;
    } finally {
      await cleanupTempFile(tempPath);
    }
  },

  async replace(
    asset: MediaLibrary.Asset,
    existingRemoteFileId: string,
    deviceId: string,
    onProgress?: (ratio: number) => void,
  ): Promise<string> {
    const { fileId, fileSize, localFilePath, fileExtension, tempPath, credentials } = await uploadAssetToBucket(
      asset,
      deviceId,
      onProgress,
    );

    try {
      await uploadService.replaceFileEntry(existingRemoteFileId, { fileId, size: fileSize });

      await uploadThumbnailForAsset(localFilePath, fileExtension, existingRemoteFileId, credentials);

      return existingRemoteFileId;
    } finally {
      await cleanupTempFile(tempPath);
    }
  },
};
