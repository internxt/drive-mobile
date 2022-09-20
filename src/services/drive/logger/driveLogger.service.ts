import { BaseLogger } from '@internxt-mobile/services/common';

export class DriveLogger extends BaseLogger {
  constructor() {
    super({
      tag: 'DRIVE',
    });
  }
}

export const driveLogger = new DriveLogger();
