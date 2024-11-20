/* eslint-disable @typescript-eslint/no-explicit-any */
import * as RNFS from '@dr.pogodin/react-native-fs';
import EventEmitter from 'events';

import { Abortable } from '../../../types';
import { DriveEventKey } from '../../../types/drive';
import { driveLogger, DriveLogger } from '../logger';

class DriveEventEmitter {
  private readonly logger: DriveLogger;
  private readonly eventEmitter: EventEmitter;
  private downloadAbort?: Abortable;
  private _jobId?: number;
  private legacyAbortable?: Abortable;

  constructor(logService: DriveLogger) {
    this.logger = logService;
    this.eventEmitter = new EventEmitter();
    this.eventEmitter.addListener(DriveEventKey.CancelDownload, () => this.onDownloadCanceled());
  }

  public emit({ id, event }: { id?: string; event: DriveEventKey }, ...args: any[]) {
    return this.eventEmitter.emit(this.getEventKey({ id, event }), args);
  }

  public addListener({
    id,
    event,
    listener,
  }: {
    id?: string;
    event: DriveEventKey;
    listener: (...args: any[]) => void;
  }) {
    this.eventEmitter.addListener(this.getEventKey({ id, event }), listener);
  }

  public removeListener({
    id,
    event,
    listener,
  }: {
    id?: string;
    event: DriveEventKey;
    listener: (...args: any[]) => void;
  }) {
    this.eventEmitter.removeListener(this.getEventKey({ id, event }), listener);
  }

  public removeAllListeners({ id, event }: { id?: string; event: DriveEventKey }) {
    this.eventEmitter.removeAllListeners(this.getEventKey({ id, event }));
  }

  public setDownloadAbort(abortable: Abortable) {
    this.downloadAbort = abortable;
  }

  public setLegacyAbortable(legacyAbortable: Abortable) {
    this.legacyAbortable = legacyAbortable;
  }

  public setJobId(jobId: number) {
    this._jobId = jobId;
  }

  public get jobId() {
    return this._jobId;
  }

  private getEventKey({ id, event }: { id?: string; event: DriveEventKey }) {
    return id ? `${event}-${id}` : event;
  }

  private onDownloadCanceled() {
    this.logger.info('onDownloadCanceled - downloadAbort: ' + this.downloadAbort);
    this.logger.info('onDownloadCanceled - legacyAbortable: ' + this.legacyAbortable);
    this.logger.info('onDownloadCanceled - jobId: ' + this.jobId);

    this.downloadAbort?.();
    this.legacyAbortable?.();
    this.jobId !== undefined && RNFS.stopDownload(this.jobId);

    if (this.jobId !== undefined) {
      this.emit({ event: DriveEventKey.CancelDownloadEnd });
      this.emit({ event: DriveEventKey.DownloadFinally });
    }

    this.downloadAbort = undefined;
    this._jobId = undefined;
    this.legacyAbortable = undefined;
  }
}

export const driveEvents = new DriveEventEmitter(driveLogger);
