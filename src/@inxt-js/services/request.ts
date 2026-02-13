import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

import { EnvironmentConfig } from '..';
import { sha256 } from '../lib/crypto';
import packageJson from '../../../package.json';

export async function request(
  config: EnvironmentConfig,
  method: AxiosRequestConfig['method'],
  targetUrl: string,
  params: AxiosRequestConfig,
): Promise<AxiosResponse<JSON>> {
  const DefaultOptions: AxiosRequestConfig = {
    method,
    auth: {
      username: config.bridgeUser,
      password: sha256(Buffer.from(config.bridgePass)).toString('hex'),
    },
    url: targetUrl,
    maxContentLength: Infinity,
    headers: {
      'internxt-client': packageJson.name,
      'internxt-version': packageJson.version,
    },
  };

  const options = { ...DefaultOptions, ...params };

  return axios.request<JSON>(options).then((value: AxiosResponse<JSON>) => {
    return value;
  });
}

export async function plainRequest(
  method: AxiosRequestConfig['method'],
  targetUrl: string,
  params: AxiosRequestConfig,
): Promise<AxiosResponse<JSON>> {
  const DefaultOptions: AxiosRequestConfig = {
    method,
    url: targetUrl,
    maxContentLength: Infinity,
    headers: {
      'internxt-client': packageJson.name,
      'internxt-version': packageJson.version,
    },
  };

  const options = { ...DefaultOptions, ...params };

  return axios.request<JSON>(options).then((value: AxiosResponse<JSON>) => {
    return value;
  });
}

export async function get<K>(params: { responseType?: string; url: string }): Promise<K> {
  return plainRequest('GET', params.url, { responseType: params.responseType as any }).then<K>((res) => {
    return res.data as unknown as K;
  });
}

export async function getBuffer(url: string): Promise<Buffer> {
  return plainRequest('GET', url, { responseType: 'arraybuffer' }).then<Buffer>((res) => {
    return Buffer.from(res.request._response, 'base64');
  });
}
