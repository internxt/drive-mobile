import axios, { AxiosRequestConfig, Canceler } from 'axios';

import { request } from '../services/request';
import { EnvironmentConfig } from '..';

enum Methods {
  Get = 'GET',
  Post = 'POST',
  Put = 'PUT'
}

export class INXTRequest {
  private req: Promise<any> | undefined;
  private config: EnvironmentConfig;
  private cancel: Canceler;
  private useProxy: boolean;

  method: Methods;
  targetUrl: string;
  params: AxiosRequestConfig;

  static Events = {
    UploadProgress: 'upload-progress',
    DownloadProgress: 'download-progress'
  };

  constructor(config: EnvironmentConfig, method: Methods, targetUrl: string, params: AxiosRequestConfig, useProxy?: boolean) {
    this.method = method;
    this.config = config;
    this.targetUrl = targetUrl;
    this.useProxy = useProxy ?? false;
    this.params = params;

    this.cancel = () => null;
  }

  start<K>(): Promise<K> {
    // TODO: Abstract from axios
    const source = axios.CancelToken.source();

    this.cancel = source.cancel;

    const cancelToken = source.token;

    this.req = request(this.config, this.method, this.targetUrl, { ...this.params, cancelToken }, this.useProxy).then<JSON | K>(res => res.data);

    return this.req;
  }

  buffer<K>(): Promise<Buffer> {
    const source = axios.CancelToken.source();

    this.cancel = source.cancel;

    const cancelToken = source.token;

    this.req = request(this.config, this.method, this.targetUrl, { ...this.params, cancelToken }, this.useProxy).then<Buffer>(res => {
      return Buffer.from(res.request._response, 'base64');
    });

    return this.req;
  }

  abort(): void {
    this.cancel();
  }

  isCancelled(err: Error): boolean {
    return axios.isCancel(err);
  }
}
