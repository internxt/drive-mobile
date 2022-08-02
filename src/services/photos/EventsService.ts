/* eslint-disable @typescript-eslint/no-explicit-any */
import EventEmitter from 'events';
import { PhotosEventKey } from '../../types/photos';

export default class PhotosEventEmitter {
  private readonly eventEmitter: EventEmitter;

  constructor() {
    this.eventEmitter = new EventEmitter();
  }

  public emit({ id, event }: { id?: string; event: PhotosEventKey }, ...args: unknown[]) {
    return this.eventEmitter.emit(this.getEventKey({ id, event }), args);
  }

  public addListener({
    id,
    event,
    listener,
  }: {
    id?: string;
    event: PhotosEventKey;
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
    event: PhotosEventKey;
    listener: (...args: any[]) => void;
  }) {
    this.eventEmitter.removeListener(this.getEventKey({ id, event }), listener);
  }

  public removeAllListeners({ id, event }: { id?: string; event: PhotosEventKey }) {
    this.eventEmitter.removeAllListeners(this.getEventKey({ id, event }));
  }

  private getEventKey({ id, event }: { id?: string; event: PhotosEventKey }) {
    return id ? `${event}-${id}` : event;
  }
}
