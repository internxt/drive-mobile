import { EnvironmentConfig } from '../index';
import { doUntil } from 'async';
import { request } from '../services/request';
import { Shard } from './shard';
import { AxiosResponse, AxiosError } from 'axios';

export interface FileInfo {
  bucket: string;
  mimetype: string;
  filename: string;
  frame: string;
  size: number;
  id: string;
  created: Date;
  hmac: {
    value: string;
    type: string;
  };
  erasure?: {
    type: string;
  };
  index: string;
}

export function GetFileInfo(config: EnvironmentConfig, bucketId: string, fileId: string): Promise<FileInfo> {
  return request(config, 'get', `${config.bridgeUrl}/buckets/${bucketId}/files/${fileId}/info`, {}, false)
    .then<FileInfo>((res: AxiosResponse) => res.data)
    .catch((err: AxiosError<any>) => {
      switch (err.response?.status) {
        case 404:
          throw Error(err.response.data.error);
        default:
          throw Error('Unhandled error: ' + err.message);
      }
    });
}

export function GetFileMirror(
  config: EnvironmentConfig,
  bucketId: string,
  fileId: string,
  limit: number | 3,
  skip: number | 0,
  excludeNodes: string[] = [],
): Promise<Shard[]> {
  const excludeNodeIds: string = excludeNodes.join(',');
  const targetUrl = `${config.bridgeUrl}/buckets/${bucketId}/files/${fileId}?limit=${limit}&skip=${skip}&exclude=${excludeNodeIds}`;

  return request(config, 'GET', targetUrl, { responseType: 'json' }, false).then((res: AxiosResponse) => res.data);
}

export function ReplacePointer(
  config: EnvironmentConfig,
  bucketId: string,
  fileId: string,
  pointerIndex: number,
  excludeNodes: string[] = [],
): Promise<Shard[]> {
  return GetFileMirror(config, bucketId, fileId, 1, pointerIndex, excludeNodes);
}

export function GetFileMirrors(config: EnvironmentConfig, bucketId: string, fileId: string): Promise<Shard[]> {
  const shards: Shard[] = [];

  return doUntil(
    (next: (err: Error | null, results?: Shard[], shards?: Shard[]) => void) => {
      GetFileMirror(config, bucketId, fileId, 3, shards.length)
        .then((results: any) => {
          results.forEach((shard: Shard) => {
            shards.push(shard);
          });
          next(null, results, shards);
        })
        .catch((err) => {
          next(err);
        });
    },
    (results: any, totalShard: any, next: any) => {
      return next(null, results.length === 0);
    },
  ).then((result: any) => result[1]);
}
