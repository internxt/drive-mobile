import { BaseLogger } from '@internxt-mobile/services/common';

export class PhotosLogger extends BaseLogger {
  constructor() {
    super({
      tag: 'PHOTOS',
    });
  }
}

export const photosLogger = new PhotosLogger();
