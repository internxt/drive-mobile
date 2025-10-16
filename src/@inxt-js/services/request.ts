import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

import { EnvironmentConfig } from '..';
import { sha256 } from '../lib/crypto';
import { getProxy, ProxyManager } from './proxy';

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
  return plainRequest('GET', params.url, { responseType: params.responseType as any }, config.useProxy).then<K>(
    (res) => {
      return res.data as unknown as K;
    },
  );
}

export async function getBuffer(url: string, config = { useProxy: false }): Promise<Buffer> {
  return plainRequest('GET', url, { responseType: 'arraybuffer' }, config.useProxy).then<Buffer>((res) => {
    return Buffer.from(res.request._response, 'base64');
  });
}
