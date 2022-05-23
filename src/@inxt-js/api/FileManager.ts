import fileSystemService, { FileWriter } from '../../services/FileSystemService';

interface FileIterator {
  next(): Promise<Buffer>;
}

class FileManager {
  private fileUri: string;

  constructor(uri: string) {
    this.fileUri = uri;
  }

  exists(): Promise<boolean> {
    return fileSystemService.exists(this.fileUri);
  }

  stream(): void {
    throw new Error('Not implemented yet');
  }

  iterator(chunkSize: number): FileIterator {
    let pos = 0;

    return {
      next: () => {
        pos += chunkSize;

        return fileSystemService.readFile(this.fileUri, chunkSize, pos - chunkSize);
      },
    };
  }

  writer(): Promise<FileWriter> {
    return fileSystemService.writeFileStream(this.fileUri);
  }

  read(length?: number, position?: number): Promise<Buffer> {
    return fileSystemService.readFile(this.fileUri, length, position);
  }

  destroy(): Promise<void> {
    return fileSystemService.unlink(this.fileUri);
  }
}

export default FileManager;
