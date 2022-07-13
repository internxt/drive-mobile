/* eslint-disable no-console */

export default class PhotosLogService {
  private readonly debug: boolean;
  private readonly PREFIX = '[PHOTOS] ';

  constructor(debug: boolean) {
    this.debug = debug;
  }

  public info(message: string): void {
    this.debug && console.log(this.PREFIX + message);
  }

  public warn(message: string): void {
    this.debug && console.warn(this.PREFIX + message);
  }

  public error(message: string): void {
    this.debug && console.error(this.PREFIX + message);
  }
}
