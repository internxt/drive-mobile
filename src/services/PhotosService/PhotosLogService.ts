/* eslint-disable no-console */
import { PhotosServiceModel } from '../../types/photos';

export default class PhotosLogService {
  private readonly model: PhotosServiceModel;
  private readonly PREFIX = '[PHOTOS] ';

  constructor(model: PhotosServiceModel) {
    this.model = model;
  }

  public info(message: string): void {
    this.model.debug && console.log(this.PREFIX + message);
  }

  public warn(message: string): void {
    this.model.debug && console.warn(this.PREFIX + message);
  }

  public error(message: string): void {
    this.model.debug && console.error(this.PREFIX + message);
  }
}
