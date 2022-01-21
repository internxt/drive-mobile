/* eslint-disable no-console */
import { PhotosServiceModel } from '../../types/photos';

export default class PhotosLogService {
  private readonly model: PhotosServiceModel;

  constructor(model: PhotosServiceModel) {
    this.model = model;
  }

  public info(message: string): void {
    this.model.debug && console.log(message);
  }

  public warn(message: string): void {
    this.model.debug && console.warn(message);
  }

  public error(message: string): void {
    this.model.debug && console.error(message);
  }
}
