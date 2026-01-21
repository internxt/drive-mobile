import * as RNFS from '@dr.pogodin/react-native-fs';
import { type StatResultT } from '@dr.pogodin/react-native-fs';
import { Platform } from 'react-native';
import { internxtFS } from '@internxt/mobile-sdk';
import * as FileSystem from 'expo-file-system';
import { shareAsync } from 'expo-sharing';
import prettysize from 'prettysize';
import ReactNativeBlobUtil from 'react-native-blob-util';
import FileViewer from 'react-native-file-viewer';
import Share from 'react-native-share';
import uuid from 'react-native-uuid';

export enum AcceptedEncodings {
  Utf8 = 'utf8',
  Ascii = 'ascii',
  Base64 = 'base64',
}

export interface FileWriter {
  write(content: string): Promise<void>;
  close(): void;
}

const ANDROID_URI_PREFIX = 'file://';

export type UsageStatsResult = Record<string, { items: RNFS.ReadDirResItemT[]; prettySize: string }>;

class FileSystemService {
  private timestamp = Date.now();
  public async prepareFileSystem() {
    await this.prepareTmpDir();
  }
  public async deleteFile(files: string[]): Promise<void> {
    try {
      await Promise.all(
        files.map(async (file) => {
          await this.unlinkIfExists(file);
        }),
      );
    } catch (error) {
      console.error('Error in bulk file deletion:', error);
      throw error;
    }
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

  public getRuntimeLogsPath(): string {
    return RNFS.DocumentDirectoryPath + '/' + this.getRuntimeLogsFileName();
  }

  public getRuntimeLogsFileName(): string {
    return `internxt_mobile_runtime_logs_${this.timestamp}.txt`;
  }

  public getDownloadsDir(): string | undefined {
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
    return (this.getTemporaryDir() + (filename || uuid.v4())).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
  public async clearTempDir(): Promise<number> {
    const items = await RNFS.readDir(this.getTemporaryDir());
    let size = 0;
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
      size += item.size;
    });

    return size;
  }

  public getCacheDir(): string {
    return RNFS.CachesDirectoryPath;
  }

  public writeFileStream(uri: string): Promise<FileWriter> {
    return ReactNativeBlobUtil.fs.writeStream(uri, 'base64').then((writeStream) => {
      return {
        write: (content: string) => writeStream.write(content),
        close: () => writeStream.close(),
      };
    });
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
    return ReactNativeBlobUtil.fs.createFile(path, content, encoding);
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

  public writeFile(): void {
    throw new Error('Not implemented yet');
  }

  public statRNFS(uri: string) {
    return RNFS.stat(uri);
  }
  public stat(uri: string): Promise<StatResultT> {
    return RNFS.stat(uri);
  }

  public async showFileViewer(uri: string, options?: string | Record<string, unknown>): Promise<void> {
    const fileInfo = await FileSystem.getInfoAsync(uri);

    if (!fileInfo.exists) {
      throw new Error('File not found');
    }

    return FileViewer.open(fileInfo.uri, options);
  }

  public async moveToAndroidDownloads(source: string) {
    /** This is only for Android */
    if (Platform.OS === 'ios') return;

    await internxtFS.saveFileToDownloads(source);
  }

  public async fileExistsAndIsNotEmpty(uri: string): Promise<boolean> {
    try {
      const stat = await this.statRNFS(uri);

      return stat.isFile() && stat.size !== 0;
    } catch {
      return false;
    }
  }

  public async mkdir(uri: string) {
    await RNFS.mkdir(uri);
  }

  public async uriToBlob(uri: string) {
    const response = await fetch(uri);
    const blob = await response.blob();

    return blob;
  }

  public getInternxtAndroidDownloadsDir() {
    return this.getDownloadsDir() + '/Internxt Downloads/';
  }

  public getPathForAndroidDownload(filename: string) {
    return this.getInternxtAndroidDownloadsDir() + filename;
  }
  public async shareFile({
    title,
    fileUri,
    saveToiOSFiles,
  }: {
    title: string;
    fileUri: string;

    saveToiOSFiles?: boolean;
  }): Promise<{ success: boolean; error?: unknown }> {
    try {
      if (saveToiOSFiles) {
        await Share.open({
          title,
          url: fileUri,
          failOnCancel: false,
          showAppsToView: true,
          saveToFiles: saveToiOSFiles,
        });

        return {
          success: true,
        };
      } else {
        if (Platform.OS == 'ios') {
          await Share.open({
            title,
            url: fileUri,
            failOnCancel: false,
            showAppsToView: true,
          });
        } else {
          await shareAsync(fileUri.startsWith('file://') ? fileUri : `file://${fileUri}`, {
            dialogTitle: title,
          });
        }

        return {
          success: true,
        };
      }
    } catch (error) {
      return { success: false, error };
    }
  }

  public async readDir(directory: string) {
    return RNFS.readDir(directory);
  }

  public async getDirSize(directory: string) {
    const assets = await this.readDir(directory);

    return assets.reduce<number>((prev, current) => {
      return prev + current.size;
    }, 0);
  }

  public async touch(path: string, time: Date) {
    await RNFS.touch(path, time);
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
    const cacheSize = cacheDir.reduce<number>((prev, current) => {
      return current.size + prev;
    }, 0);
    const tmpSize = tmpDir.reduce<number>((prev, current) => {
      return current.size + prev;
    }, 0);

    const documentsSize = documentsDir.reduce<number>((prev, current) => {
      return current.size + prev;
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

      total: {
        items: documentsDir.concat(cacheDir).concat(tmpDir),
        prettySize: prettysize(cacheSize + tmpSize + documentsSize),
      },
    };

    return dirs;
  }

  private async prepareTmpDir() {
    if (Platform.OS === 'android' && !(await this.exists(this.getTemporaryDir()))) {
      await this.mkdir(this.getTemporaryDir());
    }

    await this.unlinkIfExists(ReactNativeBlobUtil.fs.dirs.DocumentDir + '/RNFetchBlob_tmp');
    await this.clearTempDir();
  }

  public async checkAvailableStorage(requiredSpace: number): Promise<boolean> {
    try {
      const fsInfo = await RNFS.getFSInfo();
      const freeSpace = fsInfo.freeSpace;

      const spaceWithBuffer = requiredSpace * 1.3;

      return freeSpace >= spaceWithBuffer;
    } catch (error) {
      throw new Error('Could not check available storage');
    }
  }
}

const fileSystemService = new FileSystemService();
export const fs = fileSystemService;
export default fileSystemService;
