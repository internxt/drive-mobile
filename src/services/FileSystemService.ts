import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import RNFetchBlob, { RNFetchBlobStat } from 'rn-fetch-blob';
import FileViewer from 'react-native-file-viewer';
import * as FileSystem from 'expo-file-system';
import prettysize from 'prettysize';
import { PHOTOS_PREVIEWS_DIRECTORY, PHOTOS_FULL_SIZE_DIRECTORY } from './photos/constants';
import Share from 'react-native-share';
import uuid from 'react-native-uuid';
enum AcceptedEncodings {
  Utf8 = 'utf8',
  Ascii = 'ascii',
  Base64 = 'base64',
}

export interface FileWriter {
  write(content: string): Promise<void>;
  close(): void;
}

const ANDROID_URI_PREFIX = 'file://';

export type UsageStatsResult = Record<string, { items: RNFS.ReadDirItem[]; prettySize: string }>;
class FileSystemService {
  public async prepareTmpDir() {
    if (Platform.OS === 'android' && !(await this.exists(this.getTemporaryDir()))) {
      await this.mkdir(this.getTemporaryDir());
    }
    await this.unlinkIfExists(RNFetchBlob.fs.dirs.DocumentDir + '/RNFetchBlob_tmp');
    await this.clearTempDir();
  }
  public pathToUri(path: string): string {
    if (path.startsWith(ANDROID_URI_PREFIX)) return path;
    return Platform.OS === 'android' ? ANDROID_URI_PREFIX + path : path;
  }

  public uriToPath(uri: string): string {
    return uri.replace(ANDROID_URI_PREFIX, '');
  }

  public getDocumentsDir(): string {
    return RNFS.DocumentDirectoryPath;
  }

  public getDownloadsDir(): string {
    // MainBundlePath is only available on iOS
    return Platform.OS === 'ios' ? RNFS.MainBundlePath : RNFS.DownloadDirectoryPath;
  }

  public getDatabasesDir(): string {
    return RNFS.LibraryDirectoryPath + '/LocalDatabase';
  }

  public toBase64(path: string) {
    return RNFS.read(path);
  }

  public moveFile(source: string, target: string): Promise<void> {
    return RNFS.moveFile(source, target);
  }

  public copyFile(source: string, target: string): Promise<void> {
    return RNFS.copyFile(source, target);
  }

  public getTemporaryDir(): string {
    if (Platform.OS === 'android') {
      return RNFS.DocumentDirectoryPath + '/tmp/';
    }
    return RNFS.TemporaryDirectoryPath;
  }

  public tmpFilePath(filename?: string) {
    return this.getTemporaryDir() + (filename || uuid.v4());
  }
  public async clearTempDir(): Promise<void> {
    const items = await RNFS.readDir(this.getTemporaryDir());

    items.forEach(async (item) => {
      // Some library is writing this file
      // in the tmp directory, on startup
      // something is trying to pick the file,
      // so we avoid deleting this file. Otherwise
      // the app crashes on startup.
      if (item.path.includes('NSIRD')) {
        return;
      }
      await this.unlink(item.path);
    });
  }

  public getCacheDir(): string {
    return RNFS.CachesDirectoryPath;
  }

  public readFileStream(): void {
    throw new Error('Not implemented yet');
  }

  public readFile(uri: string, length?: number, position?: number): Promise<Buffer> {
    return RNFS.read(uri, length, position, 'base64').then((res) => {
      return Buffer.from(res, 'base64');
    });
  }

  public exists(uri: string): Promise<boolean> {
    return RNFS.exists(uri);
  }

  public createFile(path: string, content: string, encoding: AcceptedEncodings): Promise<void> {
    return RNFetchBlob.fs.createFile(path, content, encoding);
  }

  public createEmptyFile(path: string): Promise<void> {
    return this.createFile(path, '', AcceptedEncodings.Utf8);
  }

  public unlink(uri: string): Promise<void> {
    return RNFS.unlink(uri);
  }

  public async unlinkIfExists(uri: string): Promise<boolean> {
    try {
      await this.unlink(uri);
      return true;
    } catch (e) {
      return false;
    }
  }

  public writeFileStream(uri: string): Promise<FileWriter> {
    return RNFetchBlob.fs.writeStream(uri, 'base64').then((writeStream) => {
      return {
        write: (content: string) => writeStream.write(content),
        close: () => writeStream.close(),
      };
    });
  }

  public writeFile(): void {
    throw new Error('Not implemented yet');
  }

  public statRNFS(uri: string) {
    return RNFS.stat(uri);
  }
  public stat(uri: string): Promise<RNFetchBlobStat> {
    return RNFetchBlob.fs.stat(uri);
  }

  public async showFileViewer(uri: string, options?: string | Record<string, unknown>): Promise<void> {
    const fileInfo = await FileSystem.getInfoAsync(uri);

    if (!fileInfo.exists) {
      throw new Error('File not found');
    }

    return FileViewer.open(fileInfo.uri, options);
  }

  public async mkdir(uri: string) {
    await RNFS.mkdir(uri);
  }

  public async uriToBlob(uri: string) {
    const response = await fetch(uri);
    const blob = await response.blob();

    return blob;
  }

  public async shareFile({ title, fileUri }: { title: string; fileUri: string }) {
    return Share.open({ title, url: fileUri, failOnCancel: false });
  }

  public async getUsageStats(): Promise<UsageStatsResult> {
    const readDirOrNot = async (directory: string) => {
      try {
        const dir = await RNFS.readDir(directory);

        return dir;
      } catch (e) {
        return [];
      }
    };
    const cacheDir = await readDirOrNot(this.getCacheDir());
    const tmpDir = await readDirOrNot(this.getTemporaryDir());
    const documentsDir = await readDirOrNot(this.getDocumentsDir());
    const photosPreviewsDir = await readDirOrNot(PHOTOS_PREVIEWS_DIRECTORY);
    const photosFullSizeDir = await readDirOrNot(PHOTOS_FULL_SIZE_DIRECTORY);
    const cacheSize = cacheDir.reduce<number>((prev, current) => {
      return parseInt(current.size + prev);
    }, 0);
    const tmpSize = tmpDir.reduce<number>((prev, current) => {
      return parseInt(current.size + prev);
    }, 0);

    const documentsSize = documentsDir.reduce<number>((prev, current) => {
      return parseInt(current.size + prev);
    }, 0);

    const photosPreviewsSize = photosPreviewsDir.reduce<number>((prev, current) => {
      return parseInt(current.size + prev);
    }, 0);

    const photosFullSizeSize = photosFullSizeDir.reduce<number>((prev, current) => {
      return parseInt(current.size + prev);
    }, 0);
    const dirs: UsageStatsResult = {
      cache: {
        items: cacheDir,
        prettySize: prettysize(cacheSize),
      },
      tmp: {
        items: tmpDir,
        prettySize: prettysize(tmpSize),
      },
      documents: {
        items: documentsDir,
        prettySize: prettysize(documentsSize),
      },
      photos_previews: {
        items: photosPreviewsDir,
        prettySize: prettysize(photosPreviewsSize),
      },
      photos_full_size: {
        items: photosFullSizeDir,
        prettySize: prettysize(photosFullSizeSize),
      },
      total: {
        items: documentsDir.concat(cacheDir).concat(tmpDir).concat(photosPreviewsDir).concat(photosFullSizeDir),
        prettySize: prettysize(cacheSize + tmpSize + documentsSize + photosPreviewsSize + photosFullSizeSize),
      },
    };

    return dirs;
  }
}

const fileSystemService = new FileSystemService();
export default fileSystemService;
