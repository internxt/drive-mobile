import { EnvironmentConfig } from '..';
import { INXTRequest } from '../lib';

export enum Methods {
  Get = 'GET',
  Post = 'POST',
  Put = 'PUT',
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
  createFileToken(bucketId: string, fileId: string, operation: 'PUSH' | 'PULL'): INXTRequest;
}

function emptyINXTRequest(config: EnvironmentConfig): INXTRequest {
  return new INXTRequest(config, Methods.Get, '', {}, false);
}

class InxtApi implements InxtApiI {
  protected config: EnvironmentConfig;
  protected url: string;

  constructor(config: EnvironmentConfig) {
    this.config = config;
    this.url = config.bridgeUrl ?? '';
  }

  createFileToken(bucketId: string, fileId: string, operation: 'PUSH' | 'PULL'): INXTRequest {
    const targetUrl = `${this.url}/buckets/${bucketId}/files/${fileId}/tokens`;

    return new INXTRequest(
      this.config,
      Methods.Post,
      targetUrl,
      {
        data: {
          operation,
        },
      },
      false,
    );
  }
}

export class EmptyBridgeUrlError extends Error {
  constructor() {
    super('Empty bridge url');
  }
}

export class Bridge extends InxtApi {
  constructor(config: EnvironmentConfig) {
    if (config.bridgeUrl === '') {
      throw new EmptyBridgeUrlError();
    }
    super(config);
  }
}
