import { EncryptionVersion } from '@internxt/sdk/dist/drive/storage/types';
import * as MediaLibrary from 'expo-media-library';
import { Platform } from 'react-native';
import { getEnvironmentConfigFromUser } from 'src/lib/network';
import { uploadFile } from 'src/network/upload';
import { constants } from 'src/services/AppService';
import asyncStorageService from 'src/services/AsyncStorageService';
import { HTTP_BAD_REQUEST, HTTP_CONFLICT } from 'src/services/common/httpStatusCodes';
import { isThumbnailSupported } from 'src/services/common/media/thumbnail.constants';
import { generateThumbnail } from 'src/services/common/media/thumbnail.generation';
import { uploadService } from 'src/services/common/network/upload/upload.service';
import fileSystemService from 'src/services/FileSystemService';
import { logger } from '../common';
import { FileAlreadyExistsError } from './errors';
import { getPairedVideoPlainNameFromPhoto, isLivePhotoAsset } from './livePhoto.constants';
import { exportLivePhotoComponents } from './LivePhotoNativeModule';
import { photoBackupFolders } from './PhotoBackupFolders';
import { photoMediaLibraryService } from './PhotoMediaLibraryService';
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
  thumbnailSource: string;
  tempPath?: string;
  credentials: UploadCredentials;
}

export interface PhotoUploadResult {
  photoUuid: string;
  pairedVideoUuid?: string;
}

const resolveLocalPath = async (
  asset: MediaLibrary.Asset,
): Promise<{ localPath: string; tempPath?: string; thumbnailUri?: string }> => {
  if (Platform.OS === 'ios') {
    const assetInfo = await photoMediaLibraryService.getAssetInfo(asset.id, { shouldDownloadFromNetwork: false });
    const rawUri = assetInfo.localUri ?? asset.uri;
    if (!rawUri || rawUri.startsWith(ICLOUD_URI_SCHEME)) {
      throw new Error(`Asset ${asset.id} has no local URI — may be stored in iCloud`);
    }

    // Videos in the Photos Library are only accessible via PHAsset URI (ph://) for
    // AVFoundation-based operations like thumbnail generation. Direct /var/mobile/Media/DCIM/
    // paths fail with NSCocoaErrorDomain 257 (no permission) when passed to AVAssetImageGenerator.
    return { localPath: stripFileSchemeAndFragment(rawUri), thumbnailUri: asset.uri };
  }

  const uri = asset.uri;
  if (uri.startsWith(ANDROID_CONTENT_URI_SCHEME)) {
    const ext = extractExtensionFromContentUri(uri);
    const tempPath = `${fileSystemService.getCacheDir()}/${TEMP_FILE_PREFIX}${asset.id}.${ext}`;
    await fileSystemService.copyFile(uri, tempPath);
    return { localPath: tempPath, tempPath };
  }
  return { localPath: stripFileScheme(uri) };
};

const uploadSingleFile = async (params: {
  localFilePath: string;
  folderUuid: string;
  plainName: string;
  fileExtension: string;
  creationIso: string;
  modificationIso: string;
  credentials: UploadCredentials;
  onProgress?: (ratio: number) => void;
  signal?: AbortSignal;
}): Promise<string> => {
  const {
    localFilePath,
    folderUuid,
    plainName,
    fileExtension,
    creationIso,
    modificationIso,
    credentials,
    onProgress,
    signal,
  } = params;
  const { bucketId, encryptionKey, bridgeUser, bridgePass } = credentials;

  const fileStat = await fileSystemService.stat(localFilePath);

  const { existentFiles } = await uploadService.checkFileExistence(folderUuid, [{ plainName, type: fileExtension }]);
  if (existentFiles.length > 0) {
    return existentFiles[0].uuid;
  }

  let fileId: string;
  try {
    fileId = await uploadFile(
      localFilePath,
      bucketId,
      encryptionKey,
      constants.BRIDGE_URL,
      { user: bridgeUser, pass: bridgePass },
      { notifyProgress: onProgress, signal },
    );
  } catch (uploadError) {
    if (uploadError instanceof Error && uploadError.name !== 'Error') throw uploadError;
    const message = uploadError instanceof Error ? uploadError.message : String(uploadError);
    throw new Error(`Bucket upload failed for ${plainName}.${fileExtension}: ${message}`);
  }

  return createFileEntryOrFetchExisting({
    fileId,
    type: fileExtension,
    size: fileStat.size,
    plainName,
    bucket: bucketId,
    folderUuid,
    modificationTime: modificationIso,
    creationTime: creationIso,
  });
};

const uploadAssetToBucket = async (
  asset: MediaLibrary.Asset,
  deviceId: string,
  photosBucket: string,
  onProgress?: (ratio: number) => void,
  signal?: AbortSignal,
): Promise<FileUploadResult> => {
  const { localPath: localFilePath, tempPath, thumbnailUri } = await resolveLocalPath(asset);

  const createdDate = new Date(asset.creationTime);
  const creationIso = createdDate.toISOString();
  const modificationIso = new Date(asset.modificationTime).toISOString();
  const fileName = localFilePath.split('/').pop() ?? asset.filename;

  const [fileStat, user, folderUuid] = await Promise.all([
    fileSystemService.stat(localFilePath),
    asyncStorageService.getUser(),
    photoBackupFolders.getOrCreateFolderForDate(deviceId, createdDate),
  ]);
  const { encryptionKey, bridgeUser, bridgePass } = getEnvironmentConfigFromUser(user);
  const bucketId = photosBucket;
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
      { notifyProgress: onProgress, signal },
    );
  } catch (uploadError) {
    await cleanupTempFile(tempPath);
    if (uploadError instanceof Error && uploadError.name !== 'Error') {
      throw uploadError;
    }
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
    thumbnailSource: thumbnailUri ?? localFilePath,
    tempPath,
    credentials: { bucketId, encryptionKey, bridgeUser, bridgePass },
  };
};

const isDeletedOrTrashedError = (error: unknown): boolean => {
  const status = (error as { status?: unknown })?.status;
  return status === HTTP_BAD_REQUEST;
};

const cleanupTempFile = async (tempPath?: string): Promise<void> => {
  if (!tempPath) return;
  await fileSystemService.unlinkIfExists(tempPath);
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
  } catch (err) {
    logger.error(`Failed to upload thumbnail for file ${fileUuid} (ext=${fileExtension}, path=${localFilePath}):`, err);
  } finally {
    await cleanupTempFile(thumbnailPath);
  }
};

const createFileEntryOrFetchExisting = async (params: {
  fileId: string;
  type: string;
  size: number;
  plainName: string;
  bucket: string;
  folderUuid: string;
  modificationTime: string;
  creationTime: string;
}): Promise<string> => {
  const { plainName, type, folderUuid } = params;
  try {
    const driveFile = await uploadService.createFileEntry({
      ...params,
      encryptVersion: EncryptionVersion.Aes03,
    });
    return driveFile.uuid;
  } catch (err) {
    if ((err as { status?: number })?.status !== HTTP_CONFLICT) {
      throw err;
    }
    const { existentFiles } = await uploadService.checkFileExistence(folderUuid, [{ plainName, type }]);
    if (!existentFiles[0]?.uuid) {
      throw err;
    }
    return existentFiles[0].uuid;
  }
};

const uploadPairedVideo = async (params: {
  videoLocalPath: string;
  videoFileName: string;
  photoPlainName: string;
  folderUuid: string;
  creationIso: string;
  modificationIso: string;
  credentials: UploadCredentials;
  signal?: AbortSignal;
}): Promise<string | null> => {
  const {
    videoLocalPath,
    videoFileName,
    photoPlainName,
    folderUuid,
    creationIso,
    modificationIso,
    credentials,
    signal,
  } = params;
  const { fileExtension } = splitFileNameAndExtension(videoFileName);
  const pairedVideoPlainName = getPairedVideoPlainNameFromPhoto(photoPlainName);
  try {
    return await uploadSingleFile({
      localFilePath: videoLocalPath,
      folderUuid,
      plainName: pairedVideoPlainName,
      fileExtension,
      creationIso,
      modificationIso,
      credentials,
      signal,
    });
  } catch (err) {
    logger.error(`[PhotoUploadService] Failed to upload Live Photo paired video for photo "${photoPlainName}":`, err);
    return null;
  }
};

export const PhotoUploadService = {
  async upload(
    asset: MediaLibrary.Asset,
    deviceId: string,
    photosBucket: string,
    onProgress?: (ratio: number) => void,
    signal?: AbortSignal,
  ): Promise<PhotoUploadResult> {
    const livePhoto = Platform.OS === 'ios' && isLivePhotoAsset(asset);

    if (livePhoto) {
      let components;
      try {
        components = await exportLivePhotoComponents(asset.id);
      } catch (livePhotoErr) {
        logger.warn(
          `[PhotoUploadService] exportLivePhotoComponents failed, falling back to photo-only upload: ${livePhotoErr}`,
        );
        components = null;
      }

      if (components) {
        const photoLocalPath = stripFileSchemeAndFragment(components.photo.uri);
        const videoLocalPath = stripFileSchemeAndFragment(components.video.uri);

        try {
          const createdDate = new Date(asset.creationTime);
          const creationIso = createdDate.toISOString();
          const modificationIso = new Date(asset.modificationTime).toISOString();
          const fileName = components.photo.fileName;
          const { plainName, fileExtension } = splitFileNameAndExtension(fileName);

          const [user, folderUuid] = await Promise.all([
            asyncStorageService.getUser(),
            photoBackupFolders.getOrCreateFolderForDate(deviceId, createdDate),
          ]);
          const { encryptionKey, bridgeUser, bridgePass } = getEnvironmentConfigFromUser(user);
          const credentials: UploadCredentials = { bucketId: photosBucket, encryptionKey, bridgeUser, bridgePass };

          const photoUuid = await uploadSingleFile({
            localFilePath: photoLocalPath,
            folderUuid,
            plainName,
            fileExtension,
            creationIso,
            modificationIso,
            credentials,
            onProgress,
            signal,
          });

          await uploadThumbnailForAsset(asset.uri, fileExtension, photoUuid, credentials);

          const pairedVideoUuid = await uploadPairedVideo({
            videoLocalPath,
            videoFileName: components.video.fileName,
            photoPlainName: plainName,
            folderUuid,
            creationIso,
            modificationIso,
            credentials,
            signal,
          });

          return { photoUuid, pairedVideoUuid: pairedVideoUuid ?? undefined };
        } finally {
          await cleanupTempFile(photoLocalPath);
          await cleanupTempFile(videoLocalPath);
        }
      }
    }

    let fileUploadResult: FileUploadResult;
    try {
      fileUploadResult = await uploadAssetToBucket(asset, deviceId, photosBucket, onProgress, signal);
    } catch (err) {
      if (err instanceof FileAlreadyExistsError) {
        return { photoUuid: err.existingUuid };
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
      thumbnailSource,
      tempPath,
      credentials,
    } = fileUploadResult;

    try {
      const photoUuid = await createFileEntryOrFetchExisting({
        fileId,
        type: fileExtension,
        size: fileSize,
        plainName,
        bucket: bucketId,
        folderUuid,
        modificationTime: modificationIso,
        creationTime: creationIso,
      });

      await uploadThumbnailForAsset(thumbnailSource, fileExtension, photoUuid, credentials);

      return { photoUuid };
    } finally {
      await cleanupTempFile(tempPath);
    }
  },

  async replace(
    asset: MediaLibrary.Asset,
    existingRemoteFileId: string,
    deviceId: string,
    photosBucket: string,
    onProgress?: (ratio: number) => void,
    signal?: AbortSignal,
  ): Promise<PhotoUploadResult> {
    const livePhoto = Platform.OS === 'ios' && isLivePhotoAsset(asset);

    if (livePhoto) {
      let components;
      try {
        components = await exportLivePhotoComponents(asset.id);
      } catch (livePhotoErr) {
        logger.warn(
          `[PhotoUploadService] exportLivePhotoComponents failed during replace, falling back to photo-only: ${livePhotoErr}`,
        );
        components = null;
      }

      if (components) {
        const photoLocalPath = stripFileSchemeAndFragment(components.photo.uri);
        const videoLocalPath = stripFileSchemeAndFragment(components.video.uri);

        try {
          const createdDate = new Date(asset.creationTime);
          const creationIso = createdDate.toISOString();
          const modificationIso = new Date(asset.modificationTime).toISOString();
          const { plainName, fileExtension } = splitFileNameAndExtension(components.photo.fileName);

          const photoFileStat = await fileSystemService.stat(photoLocalPath);
          const user = await asyncStorageService.getUser();
          const { encryptionKey, bridgeUser, bridgePass } = getEnvironmentConfigFromUser(user);
          const credentials: UploadCredentials = {
            bucketId: photosBucket,
            encryptionKey,
            bridgeUser,
            bridgePass,
          };

          let photoUuid = existingRemoteFileId;
          const photoFileId = await uploadFile(
            photoLocalPath,
            photosBucket,
            encryptionKey,
            constants.BRIDGE_URL,
            { user: bridgeUser, pass: bridgePass },
            { notifyProgress: onProgress, signal },
          );

          try {
            await uploadService.replaceFileEntry(existingRemoteFileId, {
              fileId: photoFileId,
              size: photoFileStat.size,
            });
            await uploadThumbnailForAsset(asset.uri, fileExtension, existingRemoteFileId, credentials);
          } catch (replaceError) {
            if (!isDeletedOrTrashedError(replaceError)) throw replaceError;
            const folderUuid = await photoBackupFolders.getOrCreateFolderForDate(deviceId, createdDate);
            const driveFile = await uploadService.createFileEntry({
              fileId: photoFileId,
              type: fileExtension,
              size: photoFileStat.size,
              plainName,
              bucket: photosBucket,
              folderUuid,
              encryptVersion: EncryptionVersion.Aes03,
              modificationTime: modificationIso,
              creationTime: creationIso,
            });
            await uploadThumbnailForAsset(asset.uri, fileExtension, driveFile.uuid, credentials);
            photoUuid = driveFile.uuid;
          }

          // Retrieve folderUuid for the paired video (may differ from original if photo was re-created)
          const folderUuid = await photoBackupFolders.getOrCreateFolderForDate(deviceId, createdDate);
          const pairedVideoUuid = await uploadPairedVideo({
            videoLocalPath,
            videoFileName: components.video.fileName,
            photoPlainName: plainName,
            folderUuid,
            creationIso,
            modificationIso,
            credentials,
            signal,
          });

          return { photoUuid, pairedVideoUuid: pairedVideoUuid ?? undefined };
        } finally {
          await cleanupTempFile(photoLocalPath);
          await cleanupTempFile(videoLocalPath);
        }
      }
    }

    const {
      fileId,
      fileSize,
      thumbnailSource,
      fileExtension,
      tempPath,
      credentials,
      plainName,
      bucketId,
      folderUuid,
      modificationIso,
      creationIso,
    } = await uploadAssetToBucket(asset, deviceId, photosBucket, onProgress, signal);

    try {
      let photoUuid = existingRemoteFileId;
      try {
        await uploadService.replaceFileEntry(existingRemoteFileId, { fileId, size: fileSize });
        await uploadThumbnailForAsset(thumbnailSource, fileExtension, existingRemoteFileId, credentials);
      } catch (replaceError) {
        if (!isDeletedOrTrashedError(replaceError)) {
          logger.error(`Failed to replace file entry for ${existingRemoteFileId}:`, replaceError);
          throw replaceError;
        }
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
        await uploadThumbnailForAsset(thumbnailSource, fileExtension, driveFile.uuid, credentials);
        photoUuid = driveFile.uuid;
      }
      return { photoUuid };
    } finally {
      await cleanupTempFile(tempPath);
    }
  },
};
