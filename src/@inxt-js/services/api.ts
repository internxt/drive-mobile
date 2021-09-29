import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { EnvironmentConfig } from '..';
import { ExchangeReport } from '../api/reports';
import { Shard } from '../api/shard';
import { INXTRequest } from '../lib';
import { ShardMeta } from '../lib/shardMeta';

export enum Methods {
  Get = 'GET',
  Post = 'POST',
  Put = 'PUT'
}

export interface GetBucketByIdResponse {
  user: string;
  encryptionKey: string;
  publicPermissions: string[];
  created: string;
  name: string;
  pubkeys: string[];
  status: 'Active' | 'Inactive';
  transfer: number;
  storage: number;
  id: string;
}

export interface GetFileByIdResponse {
  /* file-id */
  id: string;
}

export interface FrameStaging {
  /* frame id */
  id: string;
  /* user email */
  user: string;
  shards: [];
  storageSize: number;
  /* frame size */
  size: number;
  locked: boolean;
  /* created timestamp stringified */
  created: string;
}

export interface CreateEntryFromFrameBody {
  frame: string;
  filename: string;
  index: string;
  hmac: {
    type: string,
    value: string
  };
  erasure?: {
    type: string
  };
}

export interface CreateEntryFromFrameResponse {
  /* bucket entry id */
  id: string;
  index: string;
  /* frame id */
  frame: string;
  /* bucket id */
  bucket: string;
  mimetype: string;
  name: string;
  renewal: string;
  created: string;
  hmac: {
    value: string,
    type: string
  };
  erasure: {
    type: string
  };
  size: number;
}

export interface SendShardToNodeResponse {
  result: string;
}

export interface AddShardToFrameBody {
  /* shard hash */
  hash: string;
  /* shard size */
  size: number;
  /* shard index */
  index: number;
  /* if exists a shard parity for this shard */
  parity: boolean;
  /* shard challenges */
  challenges: string[];
  tree: string[];
  /* nodes excluded from being the shard's node */
  exclude: string[];
}

export interface SendShardToNodeResponse {
  result: string;
}

export interface CreateFileTokenResponse {
  bucket: string;
  encryptionKey: string;
  expires: string;
  id: string;
  mimetype: string;
  operation: 'PUSH' | 'PULL';
  size: number;
  token: string;
}

export interface InxtApiI {
  getBucketById(bucketId: string, params?: AxiosRequestConfig): INXTRequest;
  getFileById(bucketId: string, fileId: string, params?: AxiosRequestConfig): INXTRequest;
  createFrame(params?: AxiosRequestConfig): INXTRequest;
  createEntryFromFrame(bucketId: string, body: CreateEntryFromFrameBody, params?: AxiosRequestConfig): INXTRequest;
  addShardToFrame(frameId: string, body: ShardMeta, params?: AxiosRequestConfig): INXTRequest;
  sendUploadExchangeReport(exchangeReport: ExchangeReport): Promise<AxiosResponse<JSON>>;
  sendShardToNode(shard: Shard, shardContent: Buffer): INXTRequest;
  getShardFromNode(shard: Shard): INXTRequest;
  createFileToken(bucketId: string, fileId: string, operation: 'PUSH' | 'PULL'): INXTRequest;
  requestPut(shard: Shard): INXTRequest;
  requestGet(shard: Shard): INXTRequest;
  putShard(url: string, content: Buffer): INXTRequest;
}

function emptyINXTRequest(config: EnvironmentConfig): INXTRequest {
  return new INXTRequest(config, Methods.Get, '', { }, false);
}

class InxtApi implements InxtApiI {
  protected config: EnvironmentConfig;
  protected url: string;

  constructor(config: EnvironmentConfig) {
    this.config = config;
    this.url = config.bridgeUrl ?? '';
  }

  getBucketById(bucketId: string, params?: AxiosRequestConfig): INXTRequest {
    return emptyINXTRequest(this.config);
  }

  getFileById(bucketId: string, fileId: string, params?: AxiosRequestConfig): INXTRequest {
    return emptyINXTRequest(this.config);
  }

  createFrame(params?: AxiosRequestConfig): INXTRequest {
    return emptyINXTRequest(this.config);
  }

  createEntryFromFrame(bucketId: string, body: CreateEntryFromFrameBody, params?: AxiosRequestConfig): INXTRequest {
    return emptyINXTRequest(this.config);
  }

  addShardToFrame(frameId: string, body: ShardMeta, params?: AxiosRequestConfig): INXTRequest {
    return emptyINXTRequest(this.config);
  }

  sendUploadExchangeReport(exchangeReport: ExchangeReport): Promise<AxiosResponse<JSON>> {
    return exchangeReport.sendReport();
  }

  sendShardToNode(shard: Shard, shardContent: Buffer): INXTRequest {
    return emptyINXTRequest(this.config);
  }

  getShardFromNode(shard: Shard): INXTRequest {
    return emptyINXTRequest(this.config);
  }

  createFileToken(bucketId: string, fileId: string, operation: 'PUSH' | 'PULL'): INXTRequest {
    return emptyINXTRequest(this.config);
  }

  requestPut(shard: Shard): INXTRequest {
    return emptyINXTRequest(this.config);
  }

  requestGet(shard: Shard): INXTRequest {
    return emptyINXTRequest(this.config);
  }

  putShard(url: string, content: Buffer): INXTRequest {
    return emptyINXTRequest(this.config);
  }
}

// tslint:disable-next-line: max-classes-per-file
export class EmptyBridgeUrlError extends Error {
  constructor() {
    super('Empty bridge url');
  }
}

// tslint:disable-next-line: max-classes-per-file
export class Bridge extends InxtApi {
  constructor(config: EnvironmentConfig) {
    if (config.bridgeUrl === '') {
      throw new EmptyBridgeUrlError();
    }
    super(config);
  }

  getBucketById(bucketId: string, params?: AxiosRequestConfig): INXTRequest {
    const targetUrl = `${this.url}/buckets/${bucketId}`;
    const defParams: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'application/octet-stream'
      }
    };

    const finalParams = { ...defParams, ...params };

    return new INXTRequest(this.config, Methods.Get, targetUrl, finalParams, false);
  }

  getFileById(bucketId: string, fileId: string, params?: AxiosRequestConfig): INXTRequest {
    const targetUrl = `${this.url}/buckets/${bucketId}/file-ids/${fileId}`;
    const defParams: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'application/octet-stream'
      }
    };

    const finalParams = { ...defParams, ...params };

    return new INXTRequest(this.config, Methods.Get, targetUrl, finalParams, false);
  }

  createFrame(params?: AxiosRequestConfig): INXTRequest {
    const targetUrl = `${this.url}/frames`;
    const defParams: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'application/octet-stream'
      }
    };

    const finalParams = { ...defParams, ...params };

    return new INXTRequest(this.config, Methods.Post, targetUrl, finalParams, false);
  }

  createEntryFromFrame(bucketId: string, body: CreateEntryFromFrameBody, params?: AxiosRequestConfig): INXTRequest {
    const targetUrl = `${this.url}/buckets/${bucketId}/files`;
    const defParams: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'application/octet-stream'
      },
      data: body
    };

    const finalParams = { ...defParams, ...params };

    return new INXTRequest(this.config, Methods.Post, targetUrl, finalParams, false);
  }

  addShardToFrame(frameId: string, body: ShardMeta, params?: AxiosRequestConfig): INXTRequest {
    const targetUrl = `${this.url}/frames/${frameId}`;
    const defParams: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'application/octet-stream'
      },
      data: { ...body, challenges: body.challenges_as_str }
    };

    const finalParams = { ...defParams, ...params };

    return new INXTRequest(this.config, Methods.Put, targetUrl, finalParams, false);
  }

  sendUploadExchangeReport(exchangeReport: ExchangeReport): Promise<AxiosResponse<JSON>> {
    return exchangeReport.sendReport();
  }

  sendShardToNode(shard: Shard, shardContent: Buffer): INXTRequest {
    const targetUrl = `http://${shard.farmer.address}:${shard.farmer.port}/shards/${shard.hash}?token=${shard.token}`;

    return new INXTRequest(this.config, Methods.Post, targetUrl, { data: shardContent }, true);
  }

  getShardFromNode(shard: Shard): INXTRequest {
    const { farmer, hash, token } = shard;
    const { address, port } = farmer;
    const targetUrl = `http://${address}:${port}/shards/${hash}?token=${token}`;

    return new INXTRequest(this.config, Methods.Get, targetUrl, {
      headers: {
        'content-type': 'application/octet-stream'
      },
      responseType: 'arraybuffer'
    }, this.config.useProxy ?? true);
  }

  createFileToken(bucketId: string, fileId: string, operation: 'PUSH' | 'PULL'): INXTRequest {
    const targetUrl = `https://api.internxt.com/buckets/${bucketId}/tokens`;

    return new INXTRequest(this.config, Methods.Post, targetUrl, { data: { operation, file: fileId } }, false);
  }

  requestPut(shard: Shard): INXTRequest {
    const targetUrl = `http://${shard.farmer.address}:${shard.farmer.port}/upload/link/${shard.hash}`;

    return new INXTRequest(this.config, Methods.Get, targetUrl, {}, true);
  }

  requestGet(shard: Shard): INXTRequest {
    const targetUrl = `http://${shard.farmer.address}:${shard.farmer.port}/download/link/${shard.hash}`;

    return new INXTRequest(this.config, Methods.Get, targetUrl, {}, true);
  }

  putShard(url: string, content: Buffer): INXTRequest {
    return new INXTRequest(this.config, Methods.Put, url, { data: content }, false);
  }

  getShard(url: string): INXTRequest {
    return new INXTRequest(this.config, Methods.Get, url, {
      responseType: 'arraybuffer'
    }, false);
  }
}
