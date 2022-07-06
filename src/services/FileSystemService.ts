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

export interface FileWriter {
  write(content: string): Promise<void>;
  close(): void;
}

const ANDROID_URI_PREFIX = 'file://';

class FileSystemService {
  public pathToUri(path: string): string {
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
    return RNFS.TemporaryDirectoryPath;
  }

  public async clearTempDir(): Promise<void> {
    const items = await RNFS.readDir(this.getTemporaryDir());

    items.forEach(async (item) => {
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

  public async showFileViewer(uri: string, options?: RNFileViewerOptions): Promise<void> {
    const fileInfo = await FileSystem.getInfoAsync(uri);

    if (!fileInfo.exists) {
      throw new Error('File not found');
    }

    return FileViewer.open(fileInfo.uri, options);
  }

  public async mkdir(uri: string) {
    await RNFS.mkdir(uri);
  }
}

const fileSystemService = new FileSystemService();
export default fileSystemService;
