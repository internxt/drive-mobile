/* eslint-disable no-console */
import EventEmitter from 'events';
import { PhotosEventKey, PhotosServiceModel } from '../../types/photos';

export default class PhotosEventEmitter {
  private readonly model: PhotosServiceModel;
  private readonly eventEmitter: EventEmitter;

  constructor(model: PhotosServiceModel) {
    this.model = model;
    this.eventEmitter = new EventEmitter();
  }

  public emit({ id, event }: { id?: string; event: PhotosEventKey }, ...args: any[]) {
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
