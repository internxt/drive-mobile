import { request } from '../services/request';
import { EnvironmentConfig } from '..';

export interface ExchangeReportParams {
  dataHash: string | null;
  reporterId: string;
  farmerId: string | null;
  clientId: string;
  exchangeStart: Date;
  exchangeEnd: Date | null;
  exchangeResultCode: number;
  exchangeResultMessage: string;
}

export class ExchangeReport {
  static INXT_REPORT_SUCCESS = 1000;
  static INXT_REPORT_FAILURE = 1100;

  static INXT_REPORT_SHARD_UPLOADED = 'SHARD_UPLOADED';
  static INXT_REPORT_UPLOAD_ERROR = 'TRANSFER_FAILED';

  static INXT_REPORT_SHARD_DOWNLOADED = 'SHARD_DOWNLOADED';
  static INXT_REPORT_MIRROR_FAILED = 'MIRROR_FAILED';
  static INXT_REPORT_TRANSFER_FAILED = 'TRANSFER_FAILED';
  static INXT_REPORT_MIRROR_SUCCESS = 'MIRROR_SUCCESS';
  static INXT_REPORT_DOWNLOAD_ERROR = 'DOWNLOAD_ERROR';
  static INXT_REPORT_SHARD_EXISTS = 'SHARD_EXISTS';
  static INXT_REPORT_FAILED_INTEGRITY = 'FAILED_INTEGRITY';
  static INXT_REPORT_READ_FAILED = 'READ_FAILED';

  config: EnvironmentConfig;
  params: ExchangeReportParams;

  constructor(config: EnvironmentConfig) {
    this.config = config;
    this.params = {
      dataHash: null,
      reporterId: config.bridgeUser,
      farmerId: null,
      clientId: config.bridgeUser,
      exchangeStart: new Date(),
      exchangeEnd: null,
      exchangeResultCode: 1000,
      exchangeResultMessage: '',
    };
  }

  expectedResultCode(): number {
    switch (this.params.exchangeResultMessage) {
      case ExchangeReport.INXT_REPORT_SHARD_DOWNLOADED:
      case ExchangeReport.INXT_REPORT_SHARD_UPLOADED:
      case ExchangeReport.INXT_REPORT_MIRROR_SUCCESS:
      case ExchangeReport.INXT_REPORT_SHARD_EXISTS:
        return ExchangeReport.INXT_REPORT_SUCCESS;
      case ExchangeReport.INXT_REPORT_FAILED_INTEGRITY:
      case ExchangeReport.INXT_REPORT_DOWNLOAD_ERROR:
      case ExchangeReport.INXT_REPORT_TRANSFER_FAILED:
      case ExchangeReport.INXT_REPORT_MIRROR_FAILED:
      case ExchangeReport.INXT_REPORT_READ_FAILED:
        return ExchangeReport.INXT_REPORT_FAILURE;
      default:
        return 0;
    }
  }

  validate() {
    const expectedResultCode = this.expectedResultCode();

    if (
      !this.params.dataHash ||
      !this.params.farmerId ||
      expectedResultCode === 0 ||
      expectedResultCode !== this.params.exchangeResultCode
    ) {
      return false;
    }

    return true;
  }

  sendReport() {
    if (this.params.exchangeEnd === null) {
      this.params.exchangeEnd = new Date();
    }

    if (!this.validate()) {
      return Promise.reject(Error('Not valid report to send'));
    }

    return request(this.config, 'POST', `${this.config.bridgeUrl}/reports/exchanges`, { data: this.params }, false);
  }

  DownloadOk() {
    this.params.exchangeResultCode = ExchangeReport.INXT_REPORT_SUCCESS;
    this.params.exchangeResultMessage = ExchangeReport.INXT_REPORT_SHARD_DOWNLOADED;
  }

  DownloadError() {
    this.params.exchangeResultCode = ExchangeReport.INXT_REPORT_FAILURE;
    this.params.exchangeResultMessage = ExchangeReport.INXT_REPORT_DOWNLOAD_ERROR;
  }

  UploadOk() {
    this.params.exchangeResultCode = ExchangeReport.INXT_REPORT_SUCCESS;
    this.params.exchangeResultMessage = ExchangeReport.INXT_REPORT_SHARD_UPLOADED;
  }

  UploadError() {
    this.params.exchangeResultCode = ExchangeReport.INXT_REPORT_FAILURE;
    this.params.exchangeResultMessage = ExchangeReport.INXT_REPORT_UPLOAD_ERROR;
  }
}
