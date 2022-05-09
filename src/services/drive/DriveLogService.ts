/* eslint-disable no-console */
import { DriveServiceModel } from '../../types/drive';

export default class DriveLogService {
  private readonly model: DriveServiceModel;
  private readonly PREFIX = '[DRIVE] ';

  constructor(model: DriveServiceModel) {
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
