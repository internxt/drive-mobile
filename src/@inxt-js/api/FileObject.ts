import { createDecipheriv } from 'react-native-crypto';
import { doUntil, eachLimit, retry } from 'async';

import { GenerateFileKey, ripemd160, sha256 } from '../lib/crypto';

import { ShardObject } from './ShardObject';
import { FileInfo, GetFileInfo, GetFileMirrors, GetFileMirror, ReplacePointer } from './fileinfo';
import { EnvironmentConfig } from '..';
import { Shard } from './shard';
import { ExchangeReport } from './reports';
import { Download } from '../lib/events';

import { logger } from '../lib/utils/logger';
import { DEFAULT_INXT_MIRRORS, DOWNLOAD_CANCELLED } from './constants';
import { EventEmitter } from '../lib/utils/eventEmitter';
import { Bridge, InxtApiI } from '../services/api';
import { Logger } from '../lib/download';
import { wrap } from '../lib/utils/error';
import { FileManager } from '../../lib/fs';

export class FileObject extends EventEmitter {
  shards: ShardObject[] = [];
  rawShards: Shard[] = [];
  fileInfo: FileInfo | undefined;
  config: EnvironmentConfig;

  length = -1;
  final_length = -1;

  bucketId: string;
  fileId: string;

  fileKey: Buffer;

  private aborted = false;
  private api: InxtApiI;
  private file: FileManager;

  constructor(config: EnvironmentConfig, bucketId: string, fileId: string, debug: Logger, file: FileManager) {
    super();
    this.config = config;
    this.bucketId = bucketId;
    this.fileId = fileId;
    this.fileKey = Buffer.alloc(0);

    this.api = new Bridge(config);
    this.file = file;

    this.once(DOWNLOAD_CANCELLED, this.abort.bind(this));
  }

  checkIfIsAborted(): void {
    if (this.isAborted()) {
      throw new Error('Download aborted');
    }
  }

  async getInfo(): Promise<FileInfo | undefined> {
    this.checkIfIsAborted();

    logger.info('Retrieving file info...');

    if (!this.fileInfo) {
      this.fileInfo = await GetFileInfo(this.config, this.bucketId, this.fileId).catch((err) => {
        throw wrap('Get file info error', err);
      });
      if (this.config.encryptionKey) {
        this.fileKey = await GenerateFileKey(
          this.config.encryptionKey,
          this.bucketId,
          Buffer.from(this.fileInfo.index, 'hex'),
        ).catch((err) => {
          throw wrap('Generate file key error', err);
        });
      }
    }

    return this.fileInfo;
  }

  async getMirrors(): Promise<void> {
    this.checkIfIsAborted();

    logger.info('Retrieving file mirrors...');

    this.rawShards = (await GetFileMirrors(this.config, this.bucketId, this.fileId)).filter((shard) => !shard.parity);

    await eachLimit(this.rawShards, 1, (shard: Shard, nextShard) => {
      let attempts = 0;

      const farmerIsOk = shard.farmer && shard.farmer.nodeID && shard.farmer.port && shard.farmer.address;

      if (farmerIsOk) {
        shard.farmer.address = shard.farmer.address.trim();

        return nextShard(null);
      }

      logger.warn('Pointer for shard ' + shard.index + ' failed, retrieving a new one');

      let validPointer = false;

      doUntil(
        (next: (err: Error | null, result: Shard | null) => void) => {
          ReplacePointer(this.config, this.bucketId, this.fileId, shard.index, [])
            .then((newShard) => {
              next(null, newShard[0]);
            })
            .catch((err) => {
              next(err, null);
            })
            .finally(() => {
              attempts++;
            });
        },
        (result: Shard | null, next: any) => {
          validPointer =
            result && result.farmer && result.farmer.nodeID && result.farmer.port && result.farmer.address
              ? true
              : false;

          return next(null, validPointer || attempts >= DEFAULT_INXT_MIRRORS);
        },
      )
        .then((result: any) => {
          logger.info('Pointer replaced for shard %s', shard.index);

          if (!validPointer) {
            throw new Error(`Missing pointer for shard ${shard.hash}`);
          }

          result.farmer.address = result.farmer.address.trim();

          this.rawShards[shard.index] = result;

          nextShard(null);
        })
        .catch((err) => {
          nextShard(wrap('Bridge request pointer error', err));
        });
    });

    this.length = this.rawShards.reduce(
      (a, b) => {
        return { size: a.size + b.size };
      },
      { size: 0 },
    ).size;
    this.final_length = this.rawShards
      .filter((x) => x.parity === false)
      .reduce(
        (a, b) => {
          return { size: a.size + b.size };
        },
        { size: 0 },
      ).size;
  }

  async downloadShard(shard: Shard, excluded: string[] = []): Promise<Buffer> {
    this.checkIfIsAborted();

    logger.info('Downloading shard ' + shard.index + ' from farmer ' + shard.farmer.nodeID);

    const exchangeReport = new ExchangeReport(this.config);

    return new Promise((resolve, reject) => {
      retry(
        { times: this.config.config?.shardRetry || 3, interval: 1000 },
        (nextTry: any) => {
          exchangeReport.params.exchangeStart = new Date();
          exchangeReport.params.farmerId = shard.farmer.nodeID;
          exchangeReport.params.dataHash = shard.hash;

          ShardObject.download(shard, (err, downloadedShard) => {
            if (err) {
              return nextTry(err);
            }

            const shardHash = ripemd160(sha256(downloadedShard));

            if (Buffer.compare(shardHash, Buffer.from(shard.hash, 'hex')) !== 0) {
              logger.debug('Expected hash ' + shard.hash + ', but hash is ' + shardHash.toString('hex'));

              return nextTry(new Error('Shard failed integrity check'), null);
            }

            exchangeReport.DownloadOk();
            exchangeReport.sendReport().catch(() => undefined);

            return nextTry(null, downloadedShard);
          });
        },
        async (err: Error | null | undefined, result: Buffer | undefined) => {
          try {
            if (result) {
              return resolve(result);
            }

            logger.warn(
              'It seems that shard ' +
                shard.index +
                ' download from farmer ' +
                shard.farmer.nodeID +
                ' went wrong due to ' +
                err.message +
                '. Replacing pointer',
            );

            excluded.push(shard.farmer.nodeID);

            const newShard = await GetFileMirror(this.config, this.bucketId, this.fileId, 1, shard.index, excluded);

            if (!newShard[0].farmer) {
              return reject(wrap('File missing shard error', err));
            }

            const buffer = await this.downloadShard(newShard[0], excluded);

            return resolve(buffer);
          } catch (err) {
            return reject(err);
          }
        },
      );
    });
  }

  async download(): Promise<void> {
    const fileWriter = await this.file.writer();

    try {
      if (!this.fileInfo) {
        throw new Error('Undefined fileInfo');
      }

      const decipher = createDecipheriv(
        'aes-256-ctr',
        this.fileKey.slice(0, 32),
        Buffer.from(this.fileInfo.index, 'hex').slice(0, 16),
      );

      for (const shard of this.rawShards) {
        const shardBuffer = await this.downloadShard(shard);

        logger.info('Shard ' + shard.index + ' downloaded OK, size: ' + shardBuffer.length);

        decipher.write(shardBuffer);

        const shardDecrypted: Buffer = decipher.read();

        await fileWriter.write(shardDecrypted.toString('base64'));

        this.emit(Download.Progress, shardDecrypted.length);
      }

      fileWriter.close();
    } catch (err) {
      fileWriter.close();
      this.file.destroy();
      throw wrap('Download shard error', err);
    }
  }

  abort(): void {
    logger.info('Aborting file upload');

    this.aborted = true;
  }

  isAborted(): boolean {
    return this.aborted;
  }
}
