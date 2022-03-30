import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

import { EnvironmentConfig } from '..';
import { sha256 } from '../lib/crypto';
import { ExchangeReport } from '../api/reports';

import { ShardMeta } from '../lib/shardMeta';
import { ContractNegotiated } from '../lib/contracts';
import { Shard } from '../api/shard';
import { getProxy, ProxyManager } from './proxy';

const INXT_API_URL = 'https://api.internxt.com';

export async function request(
  config: EnvironmentConfig,
  method: AxiosRequestConfig['method'],
  targetUrl: string,
  params: AxiosRequestConfig,
  useProxy = true,
): Promise<AxiosResponse<JSON>> {
  let reqUrl = targetUrl;
  let proxy: ProxyManager;

  if (useProxy) {
    proxy = await getProxy();
    reqUrl = `${proxy.url}/${targetUrl}`;
  }

  const DefaultOptions: AxiosRequestConfig = {
    method,
    auth: {
      username: config.bridgeUser,
      password: sha256(Buffer.from(config.bridgePass)).toString('hex'),
    },
    url: reqUrl,
    maxContentLength: Infinity,
  };

  const options = { ...DefaultOptions, ...params };

  return axios.request<JSON>(options).then((value: AxiosResponse<JSON>) => {
    if (useProxy && proxy) {
      proxy.free();
    }

    return value;
  });
}

export async function plainRequest(
  method: AxiosRequestConfig['method'],
  targetUrl: string,
  params: AxiosRequestConfig,
  useProxy = true,
): Promise<AxiosResponse<JSON>> {
  let reqUrl = targetUrl;
  let proxy: ProxyManager;

  if (useProxy) {
    proxy = await getProxy();
    reqUrl = `${proxy.url}/${targetUrl}`;
  }

  const DefaultOptions: AxiosRequestConfig = {
    method,
    url: reqUrl,
    maxContentLength: Infinity,
  };

  const options = { ...DefaultOptions, ...params };

  return axios.request<JSON>(options).then((value: AxiosResponse<JSON>) => {
    if (useProxy && proxy) {
      proxy.free();
    }

    return value;
  });
}

export async function get<K>(params: { responseType?: string; url: string }, config = { useProxy: false }): Promise<K> {
  return plainRequest('GET', params.url, { responseType: params.responseType }, config.useProxy).then<K>((res) => {
    return res.data as unknown as K;
  });
}

export async function getBuffer(url: string, config = { useProxy: false }): Promise<Buffer> {
  return plainRequest('GET', url, { responseType: 'arraybuffer' }, config.useProxy).then<Buffer>((res) => {
    return Buffer.from(res.request._response, 'base64');
  });
}

interface getBucketByIdResponse {
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

/**
 * Checks if a bucket exists given its id
 * @param config App config
 * @param bucketId
 * @param token
 * @param jwt JSON Web Token
 * @param params
 */
export function getBucketById(
  config: EnvironmentConfig,
  bucketId: string,
  params?: AxiosRequestConfig,
): Promise<getBucketByIdResponse | void> {
  const URL = config.bridgeUrl ? config.bridgeUrl : INXT_API_URL;
  const targetUrl = `${URL}/buckets/${bucketId}`;
  const defParams: AxiosRequestConfig = {
    headers: {
      'Content-Type': 'application/octet-stream',
    },
  };

  const finalParams = { ...defParams, ...params };

  return request(config, 'get', targetUrl, finalParams, false).then<getBucketByIdResponse>(
    (res: AxiosResponse) => res.data,
  );
}

interface getFileByIdResponse {
  /* file-id */
  id: string;
}

/**
 * Checks if a file exists given its id and a bucketId
 * @param config App config
 * @param bucketId
 * @param fileId
 * @param jwt JSON Web Token
 * @param params
 */
export function getFileById(
  config: EnvironmentConfig,
  bucketId: string,
  fileId: string,
  params?: AxiosRequestConfig,
): Promise<getFileByIdResponse | void> {
  const URL = config.bridgeUrl ? config.bridgeUrl : INXT_API_URL;
  const targetUrl = `${URL}/buckets/${bucketId}/file-ids/${fileId}`;
  const defParams: AxiosRequestConfig = {
    headers: {
      'Content-Type': 'application/octet-stream',
    },
  };

  const finalParams = { ...defParams, ...params };

  return request(config, 'get', targetUrl, finalParams, false).then<getFileByIdResponse>(
    (res: AxiosResponse) => res.data,
  );
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

/**
 * Creates a file staging frame
 * @param config App config
 * @param params
 */
export function createFrame(config: EnvironmentConfig, params?: AxiosRequestConfig): Promise<FrameStaging> {
  const URL = config.bridgeUrl ? config.bridgeUrl : INXT_API_URL;
  const targetUrl = `${URL}/frames`;
  const defParams: AxiosRequestConfig = {
    headers: {
      'Content-Type': 'application/octet-stream',
    },
  };

  const finalParams = { ...defParams, ...params };

  return request(config, 'post', targetUrl, finalParams, false).then<FrameStaging>((res: AxiosResponse) => res.data);
}

export interface CreateEntryFromFrameBody {
  frame: string;
  filename: string;
  index: string;
  hmac: {
    type: string;
    value: string;
  };
  erasure?: {
    type: string;
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
    value: string;
    type: string;
  };
  erasure: {
    type: string;
  };
  size: number;
}

/**
 * Creates a bucket entry from the given frame object
 * @param {EnvironmentConfig} config App config
 * @param {string} bucketId
 * @param {CreateEntryFromFrameBody} body
 * @param {string} jwt JSON Web Token
 * @param {AxiosRequestConfig} params
 */
export function createEntryFromFrame(
  config: EnvironmentConfig,
  bucketId: string,
  body: CreateEntryFromFrameBody,
  params?: AxiosRequestConfig,
): Promise<CreateEntryFromFrameResponse | void> {
  const URL = config.bridgeUrl ? config.bridgeUrl : INXT_API_URL;
  const targetUrl = `${URL}/buckets/${bucketId}/files/ensure`;
  const defParams: AxiosRequestConfig = {
    headers: {
      'Content-Type': 'application/octet-stream',
    },
    data: body,
  };

  const finalParams = { ...defParams, ...params };

  return request(config, 'post', targetUrl, finalParams, false)
    .then<CreateEntryFromFrameResponse>((res: AxiosResponse) => res.data)
    .catch((err: AxiosError) => {
      const message = handleAxiosError(err);

      if (message.includes('duplicate key')) {
        throw new Error('File already exists in the network');
      }

      throw new Error(message);
    });
}

export function handleAxiosError(err: any): string {
  return (err.response && err.response.data && err.response.data.error) || err.message;
}

interface AddShardToFrameBody {
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

/**
 * Negotiates a storage contract and adds the shard to the frame
 * @param {EnvironmentConfig} config App config
 * @param {string} frameId
 * @param {AddShardToFrameBody} body
 * @param {string} jwt JSON Web Token
 * @param {AxiosRequestConfig} params
 */
export function addShardToFrame(
  config: EnvironmentConfig,
  frameId: string,
  body: ShardMeta,
  params?: AxiosRequestConfig,
): Promise<ContractNegotiated | void> {
  const URL = config.bridgeUrl ? config.bridgeUrl : INXT_API_URL;
  const targetUrl = `${URL}/frames/${frameId}`;
  const defParams: AxiosRequestConfig = {
    headers: {
      'Content-Type': 'application/octet-stream',
    },
    data: { ...body, challenges: body.challenges_as_str },
  };

  const finalParams = { ...defParams, ...params };

  return request(config, 'put', targetUrl, finalParams, false).then<ContractNegotiated>(
    (res: AxiosResponse) => res.data,
  );
}

/**
 * Sends an upload exchange report
 * @param config App config
 * @param body
 */
export function sendUploadExchangeReport(
  config: EnvironmentConfig,
  exchangeReport: ExchangeReport,
): Promise<AxiosResponse<JSON>> {
  return exchangeReport.sendReport();
}

interface SendShardToNodeResponse {
  result: string;
}

/**
 * Stores a shard in a node
 * @param config App config
 * @param shard Interface that has the contact info
 * @param content Buffer with shard content
 */
export function sendShardToNode(
  config: EnvironmentConfig,
  shard: Shard,
  content: Buffer,
): Promise<SendShardToNodeResponse | void> {
  const targetUrl = `http://${shard.farmer.address}:${shard.farmer.port}/shards/${shard.hash}?token=${shard.token}`;

  const defParams: AxiosRequestConfig = {
    headers: {
      'Content-Type': 'application/octet-stream',
      'x-storj-node-id': shard.farmer.nodeID,
    },
    data: content,
  };

  return request(config, 'post', targetUrl, defParams).then<SendShardToNodeResponse>((res: AxiosResponse) => res.data);
}
