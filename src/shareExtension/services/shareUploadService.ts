import * as RNFS from '@dr.pogodin/react-native-fs';
import { EncryptionVersion } from '@internxt/sdk/dist/drive/storage/types';
import { Network } from '@internxt/sdk/dist/network';
import { uploadFile, uploadMultipartFile } from '@internxt/sdk/dist/network/upload';
import { sha256 as nobleSha256 } from '@noble/hashes/sha2.js';
import { Buffer } from 'buffer';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import ReactNativeBlobUtil, { FetchBlobResponse } from 'react-native-blob-util';
import uuid from 'react-native-uuid';
import packageJson from '../../../package.json';
import { HttpUploadError, UploadNetworkError } from '../errors';
import {
  buildSdkEncryptionAdapter,
  computeRipemd160Digest,
  encryptFileForUpload,
  encryptFileIntoMultipartChunks,
} from './shareEncryptionService';
import ShareSdkManager from './ShareSdkManager';
import { generateAndUploadThumbnail } from './shareThumbnailService';

export interface ShareUploadCredentials {
  bridgeUser: string;
  userId: string;
  mnemonic: string;
  bucket: string;
}

export interface ShareUploadSession {
  network: Network;
  cryptoLib: ReturnType<typeof buildSdkEncryptionAdapter>;
}

export interface ShareUploadFileParams {
  filePath: string;
  fileName: string;
  fileExtension: string;
  fileSize?: number | null;
  folderUuid: string;
  credentials: ShareUploadCredentials;
  shareUploadSession?: ShareUploadSession;
  onFileResolved?: (fileSize: number) => void;
  onProgress?: (bytesUploaded: number) => void;
}

const MULTIPART_THRESHOLD_BYTES = 100 * 1024 * 1024;
const PART_SIZE_BYTES = 30 * 1024 * 1024;

const HTTP_SUCCESS_MIN = 200;
const HTTP_SUCCESS_MAX = 299;
const UPLOAD_PROGRESS_INTERVAL_MS = 250;

const ANDROID_TMP_DIR = `${RNFS.DocumentDirectoryPath}/tmp/`;

const getExpoEnvironmentConfig = () => {
  const expoConfigExtras = Constants.expoConfig?.extra ?? Constants.manifest2?.extra ?? {};
  return expoConfigExtras as { BRIDGE_URL: string; CLOUDFLARE_TOKEN?: string };
};

const buildBridgeClientDetails = () => ({
  clientName: packageJson.name,
  clientVersion: packageJson.version.replace('v', ''),
  desktopHeader: getExpoEnvironmentConfig().CLOUDFLARE_TOKEN ?? '',
});

export const createShareUploadSession = (credentials: ShareUploadCredentials): ShareUploadSession => {
  const bridgePasswordHex = Buffer.from(nobleSha256(new Uint8Array(Buffer.from(credentials.userId)))).toString('hex');
  const network = Network.client(getExpoEnvironmentConfig().BRIDGE_URL, buildBridgeClientDetails(), {
    bridgeUser: credentials.bridgeUser,
    userId: bridgePasswordHex,
  });
  return { network, cryptoLib: buildSdkEncryptionAdapter() };
};

export const getTmpPath = (filename: string): string => {
  const tempBaseDirectory = Platform.OS === 'android' ? ANDROID_TMP_DIR : RNFS.TemporaryDirectoryPath;
  return `${tempBaseDirectory}${filename}`;
};

/** Resolves a shared file URI to a local filesystem path and its real size.
 * On Android, content:// URIs are copied to a temp file (caller must clean it up).
 * On iOS, the file:// prefix is stripped. */
const resolveInputFile = async (
  filePath: string,
): Promise<{ localPath: string; fileSize: number; tempPath?: string }> => {
  if (Platform.OS === 'android' && filePath.startsWith('content://')) {
    if (!(await RNFS.exists(ANDROID_TMP_DIR))) await RNFS.mkdir(ANDROID_TMP_DIR);

    const lastPathSegment = filePath.split('/').pop()?.split('?')[0] ?? '';
    const extensionDotIndex = lastPathSegment.lastIndexOf('.');
    const fileExtension = extensionDotIndex > 0 ? lastPathSegment.slice(extensionDotIndex + 1) : 'tmp';
    const tempPath = getTmpPath(`${uuid.v4()}.${fileExtension}`);
    await RNFS.copyFile(filePath, tempPath);
    const fileStats = await RNFS.stat(tempPath);
    return { localPath: tempPath, fileSize: Number(fileStats.size), tempPath };
  }
  const localPath = filePath.startsWith('file://') ? decodeURIComponent(filePath.slice('file://'.length)) : filePath;
  const fileStats = await RNFS.stat(localPath);
  return { localPath, fileSize: Number(fileStats.size) };
};

/**
 * Workaround to force ReactNativeBlobUtil to use NSInputStream (streaming) instead of
 * NSData (full file in RAM). Both headers must coexist:
 * - `Transfer-Encoding: chunked` — the internal trigger: ReactNativeBlobUtil calls
 *   setHTTPBodyStream (NSInputStream) instead of dataWithContentsOfFile (NSData).
 * - `Content-Length: N` — without it, NSURLSession wouldn't know the stream size and
 *   would likely send actual chunked encoding on the wire, which presigned S3 PUT URLs
 *   may not support. With it, NSURLSession strips Transfer-Encoding: chunked before
 *   sending and emits a standard PUT.
 */
const buildStreamingHeaders = (contentLength: number) => ({
  'Content-Type': 'application/octet-stream',
  'Transfer-Encoding': 'chunked',
  'Content-Length': String(contentLength),
});

const sendFilePutRequest = async (
  url: string,
  encryptedFilePath: string,
  onProgress?: (bytesWritten: number) => void,
): Promise<FetchBlobResponse> => {
  const { size } = await RNFS.stat(encryptedFilePath);
  const uploadRequest = ReactNativeBlobUtil.fetch(
    'PUT',
    url,
    buildStreamingHeaders(Number(size)),
    ReactNativeBlobUtil.wrap(encryptedFilePath),
  );
  if (onProgress) {
    uploadRequest.uploadProgress({ interval: UPLOAD_PROGRESS_INTERVAL_MS }, (written) => onProgress(Number(written)));
  }

  let response: FetchBlobResponse;
  try {
    response = await uploadRequest;
  } catch (error) {
    throw new UploadNetworkError(error);
  }

  if (response.info().timeout) {
    throw new UploadNetworkError(new Error('Request timed out'));
  }

  const httpStatusCode = response.info().status;
  if (httpStatusCode < HTTP_SUCCESS_MIN || httpStatusCode > HTTP_SUCCESS_MAX) {
    const responseBody = response.data ?? '';
    throw new HttpUploadError(httpStatusCode, responseBody);
  }
  return response;
};

export const uploadEncryptedFile = async (
  url: string,
  encryptedFilePath: string,
  onProgress?: (bytesWritten: number) => void,
): Promise<void> => {
  await sendFilePutRequest(url, encryptedFilePath, onProgress);
};

const uploadEncryptedPart = async (
  url: string,
  partFilePath: string,
  partNumber: number,
  onProgress?: (bytesWritten: number) => void,
): Promise<{ PartNumber: number; ETag: string }> => {
  const response = await sendFilePutRequest(url, partFilePath, onProgress);
  // Android returns 'ETag', iOS returns 'Etag' — header name casing differs by platform
  const etag = Platform.OS === 'android' ? response.info().headers.ETag : response.info().headers.Etag;
  if (!etag) throw new Error(`Missing ETag for part ${partNumber}`);
  return { PartNumber: partNumber, ETag: etag };
};

const createFileEntry = async (
  fileId: string,
  fileExtension: string,
  fileSize: number,
  fileName: string,
  bucket: string,
  folderUuid: string,
) => {
  const now = new Date().toISOString();
  return ShareSdkManager.storageV2.createFileEntryByUuid({
    fileId,
    type: fileExtension,
    size: fileSize,
    plainName: fileName,
    bucket,
    folderUuid,
    encryptVersion: EncryptionVersion.Aes03,
    modificationTime: now,
    creationTime: now,
  });
};

interface UploadFileContext {
  network: Network;
  cryptoLib: ReturnType<typeof buildSdkEncryptionAdapter>;
  localPath: string;
  fileSize: number;
  bucket: string;
  mnemonic: string;
  folderUuid: string;
  fileName: string;
  fileExtension: string;
  onProgress?: (bytesUploaded: number) => void;
}

const shareUploadSingleFile = async (context: UploadFileContext): Promise<{ fileUuid: string }> => {
  const { network, cryptoLib, localPath, fileSize, bucket, mnemonic, folderUuid, fileName, fileExtension, onProgress } =
    context;
  const encryptedTempFilePath = getTmpPath(`${uuid.v4()}.enc`);
  let encryptedFileHash: string | undefined;
  try {
    const uploadedFileId = await uploadFile(
      network,
      cryptoLib,
      bucket,
      mnemonic,
      fileSize,
      async (_algorithm, key, iv) => {
        await encryptFileForUpload(localPath, encryptedTempFilePath, key as Buffer, iv as Buffer);
        const sha256HexString = await RNFS.hash(encryptedTempFilePath, 'sha256');
        encryptedFileHash = computeRipemd160Digest(Buffer.from(sha256HexString, 'hex')).toString('hex');
      },
      async (url: string) => {
        if (!encryptedFileHash) throw new Error('invariant: encryptedFileHash was not assigned by encrypt callback');
        await uploadEncryptedFile(url, encryptedTempFilePath, onProgress);
        return encryptedFileHash;
      },
    );
    const fileEntry = await createFileEntry(uploadedFileId, fileExtension, fileSize, fileName, bucket, folderUuid);
    return { fileUuid: fileEntry.uuid };
  } finally {
    const exists = await RNFS.exists(encryptedTempFilePath);
    if (exists) await RNFS.unlink(encryptedTempFilePath);
  }
};

const shareUploadMultipartFile = async (context: UploadFileContext): Promise<{ fileUuid: string }> => {
  const { network, cryptoLib, localPath, fileSize, bucket, mnemonic, folderUuid, fileName, fileExtension, onProgress } =
    context;
  const totalPartsCount = Math.ceil(fileSize / PART_SIZE_BYTES);
  const encryptedPartFilePaths = Array.from({ length: totalPartsCount }, (_, i) =>
    getTmpPath(`${uuid.v4()}_p${i}.enc`),
  );

  try {
    const uploadedFileId = await uploadMultipartFile(
      network,
      cryptoLib,
      bucket,
      mnemonic,
      fileSize,
      async (_algorithm, key, iv) => {
        await encryptFileIntoMultipartChunks(
          localPath,
          encryptedPartFilePaths,
          key as Buffer,
          iv as Buffer,
          PART_SIZE_BYTES,
        );
      },
      async (urls: string[]) => {
        const partSha256Hashes: string[] = [];
        const completedParts: { PartNumber: number; ETag: string }[] = [];

        for (let i = 0; i < urls.length; i++) {
          // Sequential intentionally: concurrent part uploads would hold multiple 30 MB encrypted
          // chunks in memory simultaneously, exceeding the iOS extension memory limit (~220 MB).
          const partByteOffset = i * PART_SIZE_BYTES;
          partSha256Hashes.push(await RNFS.hash(encryptedPartFilePaths[i], 'sha256'));
          const completedPart = await uploadEncryptedPart(
            urls[i],
            encryptedPartFilePaths[i],
            i + 1,
            onProgress ? (partBytes) => onProgress(partByteOffset + partBytes) : undefined,
          );
          completedParts.push(completedPart);
          await RNFS.unlink(encryptedPartFilePaths[i]).catch(() => undefined);
        }

        const combinedPartsHashHex = computeRipemd160Digest(Buffer.from(partSha256Hashes.join(''), 'hex')).toString(
          'hex',
        );
        return { hash: combinedPartsHashHex, parts: completedParts };
      },
      totalPartsCount,
    );
    const fileEntry = await createFileEntry(uploadedFileId, fileExtension, fileSize, fileName, bucket, folderUuid);
    return { fileUuid: fileEntry.uuid };
  } finally {
    await Promise.all(
      encryptedPartFilePaths.map((p) =>
        RNFS.exists(p).then((exists) => {
          if (exists) return RNFS.unlink(p);
        }),
      ),
    );
  }
};

export interface ShareUploadFileResult {
  thumbnailLocalUri: string | null;
}

export const shareUploadFile = async (params: ShareUploadFileParams): Promise<ShareUploadFileResult> => {
  const { filePath, fileName, fileExtension, folderUuid, credentials, shareUploadSession, onFileResolved, onProgress } =
    params;
  const { mnemonic, bucket } = credentials;

  const { localPath, fileSize, tempPath: androidTempCopyPath } = await resolveInputFile(filePath);
  onFileResolved?.(fileSize);

  const session = shareUploadSession ?? createShareUploadSession(credentials);
  const { network, cryptoLib } = session;

  let thumbnailLocalUri: string | null = null;
  try {
    const uploadContext: UploadFileContext = {
      network,
      cryptoLib,
      localPath,
      fileSize,
      bucket,
      mnemonic,
      folderUuid,
      fileName,
      fileExtension,
      onProgress,
    };

    let uploadResult: { fileUuid: string };
    if (fileSize >= MULTIPART_THRESHOLD_BYTES) {
      uploadResult = await shareUploadMultipartFile(uploadContext);
    } else {
      uploadResult = await shareUploadSingleFile(uploadContext);
    }

    try {
      thumbnailLocalUri = await generateAndUploadThumbnail(
        localPath,
        fileExtension,
        uploadResult.fileUuid,
        bucket,
        mnemonic,
        session,
      );
    } catch (error) {
      if (__DEV__) console.log('Thumbnail generation/upload failed, proceeding without it, error: ', error);
    }
  } finally {
    if (androidTempCopyPath) await RNFS.unlink(androidTempCopyPath).catch(() => undefined);
    // On iOS the OS provides a sandboxed temp copy of the shared file; clean it up after upload.
    if (Platform.OS === 'ios') await RNFS.unlink(localPath).catch(() => undefined);
  }

  return { thumbnailLocalUri };
};
