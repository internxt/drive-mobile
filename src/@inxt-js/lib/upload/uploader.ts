import { EventEmitter } from '../utils/eventEmitter';
// import { createCipheriv } from 'react-native-crypto';

import { FileObjectUpload } from '../../api/FileObjectUpload';
import { ConcurrentQueue } from '../concurrentQueue';
import { wrap } from '../utils/error';

export interface UploadRequest {
  index: number;
  finishCb?: (err: Error | null, result?: any) => void;
}

export class UploaderQueue extends ConcurrentQueue<UploadRequest> {
  private eventEmitter = new EventEmitter();
  private shardIndex = 0;
  // private concurrentUploads = 0;
  concurrency = 0;

  constructor(parallelUploads = 1, expectedUploads = 1, fileObject: FileObjectUpload) {
    super(parallelUploads, expectedUploads, UploaderQueue.upload(fileObject));

    this.concurrency = parallelUploads;
  }

  private static upload(fileObject: FileObjectUpload) {
    return async (req: UploadRequest) => {
      let length: number;

      // try {
      //   let chunk = await fileObject.getFileChunker().getNextChunk();

      //   chunk = createCipheriv('aes-256-ctr', fileObject.getEncryptionKey(), fileObject.getIndex());
      //   length = chunk.length;

      //   const shardMeta = await fileObject.uploadShard(chunk, chunk.length, fileObject.frameId, req.index, 3, false);

      //   fileObject.shardMetas.push(shardMeta);
      // } catch (err) {
      //   if (req.finishCb) {
      //     return req.finishCb(err, length);
      //   }

      //   throw err;
      // }
    };
  }

  start(nShards: number): void {
    for (let i = 0; i < nShards; i++) {
      const finishCb = (err: Error | null, chunkLength: number) => {
        if (err) {
          return this.emit('error', wrap('Farmer reques error', err));
        }
        this.emit('upload-progress', chunkLength);
      };

      this.push({ index: this.shardIndex++, finishCb });
    }
  }

  handleData(chunk: Buffer): void {
    // this.concurrentUploads++;

    // if (this.concurrentUploads === this.concurrency) {
    //   this.passthrough.pause();
    // }

    const chunkLength = chunk.length;

    const finishCb = (err: Error | null) => {
      if (err) {
        return this.emit('error', wrap('Farmer reques error', err));
      }
      // this.concurrentUploads--;
      this.emit('upload-progress', chunkLength);

      // if (this.passthrough.isPaused()) {
      //   this.passthrough.resume();
      // }
    };

    this.push({ index: this.shardIndex++, finishCb });
  }

  emit(event: string, ...args: any[]): void {
    this.eventEmitter.emit(event, args);
  }

  getListenerCount(event: string): number {
    return this.eventEmitter.listenerCount(event);
  }

  getListeners(event: string) {
    return this.eventEmitter.getListeners(event);
  }

  on(event: string, listener: (...args: any[]) => void): UploaderQueue {
    this.eventEmitter.on(event, listener);

    return this;
  }

  once(event: string, listener: (...args: any[]) => void): UploaderQueue {
    this.eventEmitter.once(event, listener);

    return this;
  }

  end(cb?: () => void): void {
    super.end(() => {
      if (cb) {
        cb();
      }
      this.emit('end');
    });
  }
}
