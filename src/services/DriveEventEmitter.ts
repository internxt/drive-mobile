/* eslint-disable @typescript-eslint/no-explicit-any */
import EventEmitter from 'events';
import { Platform } from 'react-native';
import RNFS from 'react-native-fs';

import { Abortable } from '../types';
import { DriveEventKey } from '../types/drive';

class DriveEventEmitter {
  private static eventEmitter: EventEmitter = new EventEmitter();
  private static downloadAbort?: Abortable;
  private static jobId?: number;
  private static legacyAbortable?: Abortable;

  constructor() {
    DriveEventEmitter.eventEmitter = new EventEmitter();
    DriveEventEmitter.eventEmitter.addListener(DriveEventKey.CancelDownload, this.onDownloadCanceled);
  }

  public emit({ id, event }: { id?: string; event: DriveEventKey }, ...args: any[]) {
    return DriveEventEmitter.eventEmitter.emit(this.getEventKey({ id, event }), args);
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
    DriveEventEmitter.eventEmitter.addListener(this.getEventKey({ id, event }), listener);
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
    DriveEventEmitter.eventEmitter.removeListener(this.getEventKey({ id, event }), listener);
  }

  public removeAllListeners({ id, event }: { id?: string; event: DriveEventKey }) {
    DriveEventEmitter.eventEmitter.removeAllListeners(this.getEventKey({ id, event }));
  }

  public setDownloadAbort(value: Abortable) {
    DriveEventEmitter.downloadAbort = value;
  }

  public setLegacyAbortable(legacyAbortable: Abortable) {
    DriveEventEmitter.legacyAbortable = legacyAbortable;
  }

  public setJobId(jobId: number) {
    DriveEventEmitter.jobId = jobId;
  }

  public get jobId() {
    return DriveEventEmitter.jobId;
  }

  private getEventKey({ id, event }: { id?: string; event: DriveEventKey }) {
    return id ? `${event}-${id}` : event;
  }

  private onDownloadCanceled() {
    DriveEventEmitter.downloadAbort?.();
    DriveEventEmitter.legacyAbortable?.();
    Platform.OS === 'android' && DriveEventEmitter.jobId !== undefined && RNFS.stopDownload(DriveEventEmitter.jobId);

    if (driveEventEmitter.jobId !== undefined) {
      driveEventEmitter.emit({ event: DriveEventKey.CancelDownloadEnd });
      driveEventEmitter.emit({ event: DriveEventKey.DownloadFinally });
    }

    DriveEventEmitter.downloadAbort = undefined;
    DriveEventEmitter.jobId = undefined;
    DriveEventEmitter.legacyAbortable = undefined;
  }
}

const driveEventEmitter = new DriveEventEmitter();
export default driveEventEmitter;
