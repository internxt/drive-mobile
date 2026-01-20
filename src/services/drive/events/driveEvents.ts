import * as RNFS from '@dr.pogodin/react-native-fs';
import EventEmitter from 'events';
import { Abortable } from '../../../types';
import { DriveEventKey } from '../../../types/drive/events';
import { driveLogger, DriveLogger } from '../logger';

export class DriveEventEmitter {
  private readonly logger: DriveLogger;
  private readonly eventEmiter = new EventEmitter();
  private downloadAbort?: Abortable;
  private jobId?: number;
  private legacyAbortable?: Abortable;

  constructor(logger: DriveLogger) {
    this.logger = logger;

    this.eventEmiter.addListener(DriveEventKey.CancelDownload, this.onDownloadCanceled);
  }

  public emit = ({ id, event }: { id?: string; event: DriveEventKey }, ...args: any[]) => {
    return this.eventEmiter.emit(this.getEventKey({ id, event }), ...args);
  };

  public addListener = ({
    id,
    event,
    listener,
  }: {
    id?: string;
    event: DriveEventKey;
    listener: (...args: any[]) => void;
  }) => {
    this.eventEmiter.addListener(this.getEventKey({ id, event }), listener);
  };

  public removeListener = ({
    id,
    event,
    listener,
  }: {
    id?: string;
    event: DriveEventKey;
    listener: (...args: any[]) => void;
  }) => {
    this.eventEmiter.removeListener(this.getEventKey({ id, event }), listener);
  };

  public removeAllListeners = ({ id, event }: { id?: string; event: DriveEventKey }) => {
    this.eventEmiter.removeAllListeners(this.getEventKey({ id, event }));
  };

  public setDownloadAbort = (abortable: Abortable) => {
    this.downloadAbort = abortable;
  };

  public setLegacyAbortable = (abortable: Abortable) => {
    this.legacyAbortable = abortable;
  };

  public setJobId = (jobId: number) => {
    this.jobId = jobId;
  };

  private readonly getEventKey = ({ id, event }: { id?: string; event: DriveEventKey }) => {
    return id ? `${event}-${id}` : event;
  };

  private readonly onDownloadCanceled = () => {
    this.logger.info(`Cancel download - jobId=${this.jobId}`);

    try {
      this.downloadAbort?.();
      this.legacyAbortable?.();

      if (this.jobId !== undefined) {
        RNFS.stopDownload(this.jobId);
        this.emit({ event: DriveEventKey.CancelDownloadEnd });
      }
    } catch (e) {
      this.logger.error('Cancel download failed', e);
    } finally {
      this.emit({ event: DriveEventKey.DownloadFinally });
      this.reset();
    }
  };

  private readonly reset = () => {
    this.downloadAbort = undefined;
    this.jobId = undefined;
    this.legacyAbortable = undefined;
  };
}

export const driveEvents = new DriveEventEmitter(driveLogger);
