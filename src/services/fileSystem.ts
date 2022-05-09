import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import RNFetchBlob, { RNFetchBlobStat } from 'rn-fetch-blob';
import FileViewer, { RNFileViewerOptions } from 'react-native-file-viewer';
import * as FileSystem from 'expo-file-system';

enum AcceptedEncodings {
  Utf8 = 'utf8',
  Ascii = 'ascii',
  Base64 = 'base64',
}

interface FileWriter {
  write(content: string): Promise<void>;
  close(): void;
}

interface FileIterator {
  next(): Promise<Buffer>;
}

export class FileManager {
  private fileUri: string;

  constructor(uri: string) {
    this.fileUri = uri;
  }

  exists(): Promise<boolean> {
    return exists(this.fileUri);
  }

  stream(): void {
    throw new Error('Not implemented yet');
  }

  iterator(chunkSize: number): FileIterator {
    let pos = 0;

    return {
      next: () => {
        pos += chunkSize;

        return readFile(this.fileUri, chunkSize, pos - chunkSize);
      },
    };
  }

  writer(): Promise<FileWriter> {
    return writeFileStream(this.fileUri);
  }

  read(length?: number, position?: number): Promise<Buffer> {
    return readFile(this.fileUri, length, position);
  }

  destroy(): Promise<void> {
    return unlink(this.fileUri);
  }
}

const ANDROID_URI_PREFIX = 'file://';

export function pathToUri(path: string): string {
  return Platform.OS === 'android' ? ANDROID_URI_PREFIX + path : path;
}

export function uriToPath(uri: string): string {
  return uri.replace(ANDROID_URI_PREFIX, '');
}

export function getDocumentsDir(): string {
  return RNFS.DocumentDirectoryPath;
}

export function getDownloadsDir(): string {
  // MainBundlePath is only available on iOS
  return Platform.OS === 'ios' ? RNFS.MainBundlePath : RNFS.DownloadDirectoryPath;
}

export function moveFile(source: string, target: string): Promise<void> {
  return RNFS.moveFile(source, target);
}

export function copyFile(source: string, target: string): Promise<void> {
  return RNFS.copyFile(source, target);
}

export function getTemporaryDir(): string {
  return RNFS.TemporaryDirectoryPath;
}

export async function clearTempDir(): Promise<void> {
  const items = await RNFS.readDir(getTemporaryDir());

  items.forEach(async (item) => {
    await unlink(item.path);
  });
}

export function getCacheDir(): string {
  return RNFS.CachesDirectoryPath;
}

export function readFileStream(): void {
  throw new Error('Not implemented yet');
}

export function readFile(uri: string, length?: number, position?: number): Promise<Buffer> {
  return RNFS.read(uri, length, position, 'base64').then((res) => {
    return Buffer.from(res, 'base64');
  });
}

export function exists(uri: string): Promise<boolean> {
  return RNFS.exists(uri);
}

export function createFile(path: string, content: string, encoding: AcceptedEncodings): Promise<void> {
  return RNFetchBlob.fs.createFile(path, content, encoding);
}

export function createEmptyFile(path: string): Promise<void> {
  return createFile(path, '', AcceptedEncodings.Utf8);
}

export function unlink(uri: string): Promise<void> {
  return RNFS.unlink(uri);
}

export function writeFileStream(uri: string): Promise<FileWriter> {
  return RNFetchBlob.fs.writeStream(uri, 'base64').then((writeStream) => {
    return {
      write: (content: string) => writeStream.write(content),
      close: () => writeStream.close(),
    };
  });
}

export function writeFile(): void {
  throw new Error('Not implemented yet');
}

export function stat(uri: string): Promise<RNFetchBlobStat> {
  return RNFetchBlob.fs.stat(uri);
}

export async function showFileViewer(uri: string, options?: RNFileViewerOptions): Promise<void> {
  const fileInfo = await FileSystem.getInfoAsync(uri);

  if (!fileInfo.exists) {
    throw new Error('File not found');
  }

  return FileViewer.open(uri, options);
}
