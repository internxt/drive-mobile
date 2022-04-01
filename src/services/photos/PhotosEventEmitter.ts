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

  public emit(event: PhotosEventKey) {
    return this.eventEmitter.emit(event);
  }

  public addListener(event: PhotosEventKey, handler: () => void) {
    this.eventEmitter.addListener(event, handler);
  }

  public removeListener(event: PhotosEventKey, listener: () => void) {
    this.eventEmitter.removeListener(event, listener);
  }

  public removeAllListeners(event: PhotosEventKey) {
    this.eventEmitter.removeAllListeners(event);
  }
}
