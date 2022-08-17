import { BaseLogger } from '@internxt-mobile/services/common';

export class DriveLogger extends BaseLogger {
  constructor() {
    super({
      prefix: 'DRIVE',
    });
  }
}

export const driveLogger = new DriveLogger();
