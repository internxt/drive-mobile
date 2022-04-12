/* eslint-disable @typescript-eslint/no-explicit-any */
import EventEmitter from 'events';
import { DriveEventKey } from '../types/drive';

class DriveEventEmitter {
  private readonly eventEmitter: EventEmitter;
  private downloadAbort?: (reason?: string) => void;

  constructor() {
    this.eventEmitter = new EventEmitter();

    this.eventEmitter.addListener(DriveEventKey.CancelDownload, this.onDownloadCanceled);
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

  public setDownloadAbort(downloadAbort: (reason?: string) => void) {
    this.downloadAbort = downloadAbort;
  }

  private getEventKey({ id, event }: { id?: string; event: DriveEventKey }) {
    return id ? `${event}-${id}` : event;
  }

  private onDownloadCanceled() {
    this.downloadAbort?.();
  }
}

const driveEventEmitter = new DriveEventEmitter();
export default driveEventEmitter;
